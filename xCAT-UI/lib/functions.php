<?php
/**
 * Contains all common PHP functions needed by most pages
 */

// Retain session variables across page requests
session_start();
session_write_close(); // Do not block other HTTP requests

// The settings below display error on the screen, instead of giving blank pages.
error_reporting(E_ALL);
ini_set('display_errors', true);

/**
 * Run a command using the xCAT client/server protocol
 *
 * @param    $cmd           The xCAT command
 * @param    $nr            Node range or group
 * @param    $args_array    Command arguments
 * @param    $opts_array    Command options
 * @return A tree of SimpleXML objects.
 *         See perl-xCAT/xCAT/Client.pm for the format
 */
function docmd($cmd, $nr, $args_array, $opts_array){
    // If we are not logged in,
    // do not try to communicate with xcatd
    if (!is_logged()) {
        echo "<p>You are not logged in! Failed to run command.</p>";
        return simplexml_load_string('<xcat></xcat>', 'SimpleXMLElement', LIBXML_NOCDATA);
    }

    // Create xCAT request
    // Add command, node range, and arguments to request
    $request = simplexml_load_string('<xcatrequest></xcatrequest>');
    $request->addChild('command', $cmd);
    if (!empty($nr)) {
        $request->addChild('noderange', $nr);
    }
    if (!empty($args_array)) {
        foreach ($args_array as $a) {
            $request->addChild('arg',$a);
        }
    }

    // Add user and password to request
    $usernode=$request->addChild('becomeuser');
    $usernode->addChild('username',$_SESSION["username"]);
    $usernode->addChild('password',getpassword());

    $xml = submit_request($request, 0, $opts_array);
    return $xml;
}

/**
 * Used by docmd() to submit request to xCAT
 *
 * @param    $req           Tree of SimpleXML objects
 * @param    $opts_array    Request options
 * @return A tree of SimpleXML objects
 */
function submit_request($req, $skipVerify, $opts_array){
    $xcathost = "localhost";
    $port = "3001";
    $rsp = FALSE;
    $response = '';
    $cleanexit = 0;
    $flushtail = '';

    // Determine whether to flush output or not
    $flush = false;
    if ($opts_array && in_array("flush", $opts_array)) {
        $flush = true;
    }

    // Determine how to handle the flush output
    // You can specify a function name, in place of TBD, to handle the flush output
    $flush_format = "";
    if ($opts_array && in_array("flush-format=TBD", $opts_array)) {
        $flush_format = "TBD";
    }

    // Open syslog, include the process ID and also send the log to standard error,
    // and use a user defined logging mechanism
    openlog("xCAT-UI", LOG_PID | LOG_PERROR, LOG_LOCAL0);

    // Open a socket to xcatd
    syslog(LOG_INFO, "Opening socket to xcatd...");
    if ($fp = stream_socket_client('ssl://'.$xcathost.':'.$port, $errno, $errstr, 30, STREAM_CLIENT_CONNECT)){
        $reqXML = $req->asXML();
        $nr = $req->noderange;
        $cmd = $req->command;

        syslog(LOG_INFO, "Sending request: $cmd $nr");
        stream_set_blocking($fp, 0);    // Set as non-blocking
        fwrite($fp,$req->asXML());      // Send XML to xcatd
        set_time_limit(3600);            // Set 15 minutes timeout (for long running requests)
        // The default is 30 seconds which is too short for some requests

        // Turn on output buffering
        ob_start();
        if ($flush){
            echo str_pad('',1024)."\n";
        }

        while (!feof($fp)) {
            // Read until there is no more
            // Remove newlines and add it to the response
            $str = fread($fp, 8192);
            if ($str) {
                $response .= preg_replace('/>\n\s*</', '><', $str);

                // Flush output to browser
                if ($flush) {
                    $str = $flushtail . $str;
                    if (preg_match('/[^>]+$/', $str, $matches)){
                        $flushtail = $matches[0];
                        $str = preg_replace('/[^>]+$/', '', $str);
                    } else {
                        $flushtail = '';
                    }

                    $str = preg_replace('/<errorcode>.*<\/errorcode>/', '', $str);
                    // Strip HTML tags from output
                    if ($tmp = trim(strip_tags($str))) {
                        // Format the output based on what was given for $flush_format
                        if ($flush_format == "TDB") {
                            format_TBD($tmp);
                        } else {
                            $tmp = preg_replace('/\n\s*/', "\n", $tmp);

                            // Print out output by default
                            echo '<pre style="font-size: 10px;">' . $tmp . '</pre>';
                            ob_flush();
                            flush();
                        }
                    }
                }
            }

            // Look for serverdone response
            $fullpattern = '/<xcatresponse>\s*<serverdone>\s*<\/serverdone>\s*<\/xcatresponse>/';
            $mixedpattern = '/<serverdone>\s*<\/serverdone>.*<\/xcatresponse>/';
            $recentpattern = '/<\/xcatresponse>/';
            if (preg_match($recentpattern,$str) && preg_match($mixedpattern,$response)) {
                // Transaction is done, package up XML and return it
                // Remove the serverdone response and put an xcat tag around the rest
                $count = 0;
                $response = preg_replace($fullpattern,'', $response, -1, $count); // 1st try to remove the long pattern
                if (!$count) {
                    $response = preg_replace($mixedpattern,'', $response) . '</xcatresponse>/';
                }
                $response = "<xcat>$response</xcat>";
                $response = preg_replace('/>\n\s*</', '><', $response);
                $response = preg_replace('/\n/', ':|:', $response);
                $rsp = simplexml_load_string($response,'SimpleXMLElement', LIBXML_NOCDATA);
                $cleanexit = 1;
                break;
            }
        } // End of while(!feof($fp))

        syslog(LOG_INFO, "($cmd $nr) Sending response");
        fclose($fp);
    } else {
        echo "<p>xCAT submit request socket error: $errno - $errstr</p>";
    }

    // Flush (send) the output buffer and turn off output buffering
    ob_end_flush();

    // Close syslog
    closelog();

    if (!$cleanexit) {
        if (preg_match('/^\s*<xcatresponse>.*<\/xcatresponse>\s*$/',$response)) {
            // Probably an error message
            $response = "<xcat>$response</xcat>";
            $rsp = simplexml_load_string($response,'SimpleXMLElement', LIBXML_NOCDATA);
        } else if (!$skipVerify) {
            echo "<p>(Error) xCAT response ended prematurely: ", htmlentities($response), "</p>";
            $rsp = FALSE;
        }
    }

    return $rsp;
}

/**
 * Enable password storage to split between cookie and session variable
 */
function xorcrypt($data, $key) {
    $datalen = strlen($data);
    $keylen = strlen($key);
    for ($i=0;$i<$datalen;$i++) {
        $data[$i] = chr(ord($data[$i])^ord($key[$i]));
    }

    return $data;
}

/**
 * Get password
 */
function getpassword() {
    if (isset($GLOBALS['xcat_authsecret'])) {
        $cryptext = $GLOBALS['xcat_authsecret'];
    } else if (isset($_COOKIE["xcat_authsecret"])) {
        $cryptext = $_COOKIE["xcat_authsecret"];
    } else {
        return false;
    }

    return xorcrypt($_SESSION["secretkey"], base64_decode($cryptext));
}

/**
 * Get the password splitting knowledge between server and client side persistant storage.
 * Caller should regenerate session ID when contemplating a new user/password,
 * to preclude session fixation, though fixation is limited without the secret.
 *
 * @param $password    Password
 */
function setpassword($password) {
    $randlen = strlen($password);
    $key = getrandchars($randlen);
    $cryptext = xorcrypt($password,$key);

    // Non-ascii characters, encode it in base64
    $cryptext = base64_encode($cryptext);
    setcookie("xcat_authsecret",$cryptext,0,'/xcat','',true);
    $GLOBALS["xcat_authsecret"] = $cryptext;
    $_SESSION["secretkey"] = $key;
}

/**
 * Get RAND characters
 *
 * @param $length    Length of characters
 * @return RAND characters
 */
function getrandchars($length) {
    $charset = '0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*';
    $charsize = strlen($charset);
    srand();
    $chars = '';
    for ($i=0;$i<$length;$i++) {
        $num=rand()%$charsize;
        $chars=$chars.substr($charset,$num,1);
    }

    return $chars;
}

/**
 * Determine if a user/password session exists
 *
 * @return True if user has a session, false otherwise
 */
function is_logged() {
    if (isset($_SESSION["username"]) and !is_bool(getpassword())) {
        return true;
    } else {
        return false;
    }
}

/**
 * Determine if a user is currently logged in successfully
 *
 * @return True if the user is currently logged in successfully, false otherwise
 */
function isAuthenticated() {
    if (is_logged()) {
        if ($_SESSION["xcatpassvalid"] != 1) {
            $testcred = docmd("authcheck", "", NULL, NULL);
            if (isset($testcred->{'xcatresponse'}->{'data'})) {
                $result = "".$testcred->{'xcatresponse'}->{'data'};
                if (is_numeric(strpos("Authenticated",$result))) {
                    // Logged in successfully
                    $_SESSION["xcatpassvalid"] = 1;
                } else {
                    // Not logged in
                    $_SESSION["xcatpassvalid"] = 0;
                }
            }
        }
    }

    if (isset($_SESSION["xcatpassvalid"]) and $_SESSION["xcatpassvalid"]==1) {
        return true;
    } else {
        return false;
    }
}

/**
 * Determine if a user has root access
 *
 * @return True if the user has root access, false otherwise
 */
function isRootAcess() {
    if (is_logged() && $_SESSION["xcatpassvalid"]) {
        $testacc = docmd('tabdump', '', array('-w', "name==" . $_SESSION["username"],'policy' ), array());
        if (isset($testacc->{'xcatresponse'}->{'data'}->{1})) {
            $result = $testacc->{'xcatresponse'}->{'data'}->{1};
            $result = str_replace('"', '', $result);
            $args = array();
            $args = explode(",", $result);

            // Get the comments which contains the privilege
            $comments = $args[8];
            $args = explode(";", $comments);
            // Default privilege is guest
            $privilege = 'guest';
            $_SESSION["xcatpassvalid"] = 0;
            foreach ($args as $arg) {
                // Get user privilege
                if ($arg && is_numeric(strpos($arg, "privilege"))) {
                    if (is_numeric(strpos($arg, "root"))) {
                        // Set privilege to root
                        $privilege = 'root';
                        $_SESSION["xcatpassvalid"] = 1;
                    }

                    break;
                }
            }
        }
    }

    if (strcmp($_SESSION["username"], 'root') == 0 || strcmp($_SESSION["username"], 'admin') == 0) {
        $_SESSION["xcatpassvalid"] = 1;
    }

    if (isset($_SESSION["xcatpassvalid"]) and $_SESSION["xcatpassvalid"]==1) {
        return true;
    } else {
        return false;
    }
}

/**
 * Log out of current user session
 */
function logout() {
    session_start();
    // Clear the secret cookie from browser
    if (isset($_COOKIE["xcat_authsecret"])) {
        setcookie("xcat_authsecret",'',time()-86400*7,'/xcat','',true);
    }

    // Clear any cookies where the key starts with "xcat_"
    foreach ($_COOKIE as $key => $value) {
        if (substr($key,0,5) === "xcat_") {
            unset($_COOKIE[$key]);
            setcookie($key, null, time() - 3600, '/xcat','',true);
        }
    }

    // Expire session cookie
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(),"",time()-86400*7,"/xcat",'',true);
    }

    // Clear session id
    setcookie(session_id(),"",time()-86400*7,"/");

    // Clear server store of data
    $_SESSION=array();
    session_destroy();
}

/**
 * Format a given string and echo it back to the browser
 */
function format_TBD($str) {
    // Format a given string however you want it
    echo $tmp . '<br/>';
    flush();
}
?>
