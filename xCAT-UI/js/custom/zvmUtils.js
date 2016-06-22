/*"use strict"; */
/**
 * Global variables
 */
var diskDatatable; // zVM datatable containing disks
var zfcpDatatable; // zVM datatable containing zFCP devices
var networkDatatable; // zVM datatable containing networks
var builtInXCAT = 1; // 1 means xCAT shipped with zVM
var zhcpQueryCountForDisks = 0;
var zhcpQueryCountForZfcps = 0;
var zhcpQueryCountForNetworks = 0;
var selectedNetworkHash; // Network details for each network

/**
 * Get the disk datatable
 *
 * @return Data table object
 */
function getDiskDataTable() {
    return diskDatatable;
}

/**
 * Set the disk datatable
 *
 * @param table Data table object
 */
function setDiskDataTable(table) {
    diskDatatable = table;
}

/**
 * Get the zFCP datatable
 *
 * @return Data table object
 */
function getZfcpDataTable() {
    return zfcpDatatable;
}

/**
 * Set the zFCP datatable
 *
 * @param table Data table object
 */
function setZfcpDataTable(table) {
    zfcpDatatable = table;
}

/**
 * Get the network datatable
 *
 * @return Data table object
 */
function getNetworkDataTable() {
    return networkDatatable;
}

/**
 * Set the network datatable
 *
 * @param table Data table object
 */
function setNetworkDataTable(table) {
    networkDatatable = table;
}

/**
 * Get the selectedNetworkHash datatable
 *
 * @return selectedNetworkHash two dimensional hash table object
 */
function getselectedNetworkHash() {
    return selectedNetworkHash;
}

/**
 * Set the selectedNetworkHash two dimensional hash table
 *
 * @param table selectedNetworkHash object
 */
function setselectedNetworkHash(table) {
    selectedNetworkHash = table;
}

/**
 * Display hcp node pool lookup finished
 */
function displayNodeHcpFinished(count){
    var infoBar = getNodesTabInfoBar();
    if (infoBar !== null) {
        if (count <= 0) {
            infoBar.append(" Done.");
        }else {
            infoBar.append(" .");
        }
    }
}

/**
 * Load HCP specific info
 *
 * @param data Data from HTTP request
 */
function loadHcpInfo(data) {
    var args = data.msg.split(';');
    var findingPools = 0;
    var findingPoolsCount = 0;

    // Get group
    var group = args[0].replace('group=', '');
    // Get hardware control point
    var hcp = args[1].replace('hcp=', '');

    // Get user directory entry
    var userEntry = data.rsp;
    if (!userEntry.length)
        return;

    // Get Nodes info bar
    var nodeInfoBar = getNodesTabInfoBar();
    //nodeInfoBar.append("\nEntering loadHcpInfo Load...\n");

    if (userEntry[0].indexOf('Failed') < 0) {
        if (hcp) {
            // If there is no cookie for the disk pool names
            if (!$.cookie(hcp + 'diskpools') || $.cookie(hcp + 'diskpools') === null) {
                if (nodeInfoBar !== null) {
                    nodeInfoBar.append("<BR>Finding pools and networks...");
                    findingPools = 1;
                    findingPoolsCount++;
                }
                // Get disk pools
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--diskpoolnames',
                        msg : hcp
                    },

                    success : setDiskPoolCookies,
                    complete : function() {
                        if (nodeInfoBar !== null) {
                            findingPoolsCount--;
                            displayNodeHcpFinished(findingPoolsCount);
                        }
                    }
                });
            }

            // If there is no cookie for the zFCP pool names
            if (!$.cookie(hcp + 'zfcppools') || $.cookie(hcp + 'zfcppools') === null) {

                if (nodeInfoBar !== null) {
                    if (findingPools = 0) {
                        nodeInfoBar.append("<BR>Finding pools and networks...");
                    }
                    findingPools = 1;
                    findingPoolsCount++;
                }
                // Get fcp pools
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--zfcppoolnames',
                        msg : hcp
                    },

                    success : setZfcpPoolCookies,
                    complete : function() {
                        if (nodeInfoBar !== null) {
                            findingPoolsCount--;
                            displayNodeHcpFinished(findingPoolsCount);
                        }
                    }
                });
            }

            // If there is no cookie for the network names
            if (!$.cookie(hcp + 'networks') || $.cookie(hcp + 'networks') === null) {

                if (nodeInfoBar !== null) {
                    if (findingPools = 0) {
                        nodeInfoBar.append("<BR>Finding pools and networks...");
                    }
                    findingPools = 1;
                    findingPoolsCount++;
                }
                // Get network names
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--getnetworknames',
                        msg : hcp
                    },

                    success : setNetworkCookies,
                    complete : function() {
                        if (nodeInfoBar !== null) {
                            findingPoolsCount--;
                            displayNodeHcpFinished(findingPoolsCount);
                        }
                    }
                });
            }
        } // End of if (hcp)
    } else {
        // Create warning dialog
        var warning = createWarnBar('z/VM SMAPI is not responding to ' + hcp + '.  SMAPI may need to be reset. '+userEntry[0]);
        var warnDialog = $('<div></div>').append(warning);

        // Open dialog
        warnDialog.dialog({
            title:'Warning',
            modal: true,
            close: function(){
                $(this).remove();
            },
            width: 400,
            buttons: {
                "Ok": function() {
                    $(this).dialog("close");
                }
            }
        });
    }
}

/**
 * Load user entry of a given node
 *
 * @param data Data from HTTP request
 */
function loadUserEntry(data) {
    var args = data.msg.split(';');

    // Get tab ID
    var ueDivId = args[0].replace('out=', '');
    // Get node
    var node = args[1].replace('node=', '');
    // Get user directory entry
    var userEntry = data.rsp[0].split(node + ':');

    // Remove loader
    $('#' + node + 'TabLoader').remove();

    var toggleLinkId = node + 'ToggleLink';
    $('#' + toggleLinkId).click(function() {
        // Get text within this link
        var lnkText = $(this).text();

        // Toggle user entry division
        $('#' + node + 'UserEntry').toggle();
        // Toggle inventory division
        $('#' + node + 'Inventory').toggle();

        // Change text
        if (lnkText == 'Show directory entry') {
            $(this).text('Show inventory');
        } else {
            $(this).text('Show directory entry');
        }
    });

    // Put user entry into a list
    var fieldSet = $('<fieldset></fieldset>');
    var legend = $('<legend>Directory Entry</legend>');
    fieldSet.append(legend);

    var txtArea = $('<textarea></textarea>');
    for ( var i = 1; i < userEntry.length; i++) {
        userEntry[i] = jQuery.trim(userEntry[i]);
        txtArea.append(userEntry[i]);

        if (i < userEntry.length) {
            txtArea.append('\n');
        }
    }
    txtArea.attr('readonly', 'readonly');
    fieldSet.append(txtArea);

    /**
     * Edit user entry
     */
    txtArea.bind('dblclick', function(event) {
        txtArea.attr('readonly', '');
        txtArea.css( {
            'border-width' : '1px'
        });

        saveBtn.show();
        cancelBtn.show();
        saveBtn.css('display', 'inline-table');
        cancelBtn.css('display', 'inline-table');
    });

    /**
     * Save
     */
    var saveBtn = createButton('Save').hide();
    saveBtn.bind('click', function(event) {
        // Show loader
        $('#' + node + 'StatusBarLoader').show();
        $('#' + node + 'StatusBar').show();

        // Replace user entry
        var newUserEntry = jQuery.trim(txtArea.val()) + '\n';

        // Replace user entry
        $.ajax( {
            url : 'lib/zCmd.php',
            dataType : 'json',
            data : {
                cmd : 'chvm',
                tgt : node,
                args : '--replacevs',
                att : newUserEntry,
                msg : node
            },

            success : updateZNodeStatus
        });

        // Increment node process and save it in a cookie
        incrementNodeProcess(node);

        txtArea.attr('readonly', 'readonly');
        txtArea.css( {
            'border-width' : '0px'
        });

        // Disable save button
        $(this).hide();
        cancelBtn.hide();
    });

    /**
     * Cancel
     */
    var cancelBtn = createButton('Cancel').hide();
    cancelBtn.bind('click', function(event) {
        txtArea.attr('readonly', 'readonly');
        txtArea.css( {
            'border-width' : '0px'
        });

        cancelBtn.hide();
        saveBtn.hide();
    });

    // Create info bar
    var infoBar = createInfoBar('Double click on the directory entry to edit it.');

    // Append user entry into division
    $('#' + ueDivId).append(infoBar);
    $('#' + ueDivId).append(fieldSet);
    $('#' + ueDivId).append(saveBtn);
    $('#' + ueDivId).append(cancelBtn);
}

/**
 * Increment number of processes running against a node
 *
 * @param node Node to increment running processes
 */
function incrementNodeProcess(node) {
    // Get current processes
    var procs = $.cookie(node + 'processes');
    if (procs) {
        // One more process
        procs = parseInt(procs) + 1;
        $.cookie(node + 'processes', procs);
    } else {
        $.cookie(node + 'processes', 1);
    }
}

/**
 * Update provision new node status
 *
 * @param data Data returned from HTTP request
 */
function updateZProvisionNewStatus(data) {
    // Parse ajax response
    var rsp = data.rsp;
    var args = data.msg.split(';');
    var lastCmd = args[0].replace('cmd=', '');
    var out2Id = args[1].replace('out=', '');
    if (typeof console == "object"){
          console.log("Entering updateZProvisionNewStatus. Last command:<"+lastCmd+"> All args:<"+args+">");
    }
    // IDs for status bar, tab, and loader
    var statBarId = 'zProvisionStatBar' + out2Id;
    var tabId = 'zvmProvisionTab' + out2Id;
    var loaderId = 'zProvisionLoader' + out2Id;

    var node = $('#' + tabId + ' input[name=nodeName]').val();

    /**
     * (2) Create user entry
     */
    if (lastCmd == 'nodeadd') {
        if (rsp.length) {
            $('#' + loaderId).hide();
            $('#' + statBarId).find('div').append('<pre>(Error) Failed to create node definition</pre>');
        } else {
            $('#' + statBarId).find('div').append('<pre>Node definition created for ' + node + '</pre>');

            // Write ajax response to status bar
            var prg = writeRsp(rsp, '');
            $('#' + statBarId).find('div').append(prg);

            // Create user entry
            var userEntry = $('#' + tabId + ' textarea').val();
            $.ajax( {
                url : 'lib/zCmd.php',
                dataType : 'json',
                data : {
                    cmd : 'mkvm',
                    tgt : node,
                    args : '',
                    att : userEntry,
                    msg : 'cmd=mkvm;out=' + out2Id
                },

                success : updateZProvisionNewStatus
            });
        }
    }

    /**
     * (3) Update /etc/hosts
     */
    else if (lastCmd == 'mkvm') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');
        $('#' + statBarId).find('div').append(prg);

        // If there was an error, quit
        if (containErrors(prg.html())) {
            $('#' + loaderId).hide();
        } else {
            $.ajax({
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'makehosts',
                    tgt : '',
                    args : '',
                    msg : 'cmd=makehosts;out=' + out2Id
                },

                success : updateZProvisionNewStatus
            });
        }
    }

    /**
     * If sourceforge xcat: (4) Update DNS
     */
    else if ((lastCmd == 'makehosts') && (builtInXCAT == 0)) {
        // If there was an error, quit
        if (rsp.length) {
            $('#' + loaderId).hide();
            $('#' + statBarId).find('div').append('<pre>(Error) Failed to update /etc/hosts</pre>');
        } else {
            $('#' + statBarId).find('div').append('<pre>/etc/hosts updated</pre>');
            $.ajax({
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'makedns',
                    tgt : '',
                    args : '',
                    msg : 'cmd=makedns;out=' + out2Id
                },

                success : updateZProvisionNewStatus
            });
        }
    }
    /**
     * If built in zVM xcat and last command was makehosts or
     * If sourceforge xCAT and lastCmd was makedns
     * (5) Add disk
     *
     */
    else if (((lastCmd == 'makehosts') && (builtInXCAT == 1)) ||
             ((lastCmd == 'makedns') && (builtInXCAT == 0))) {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');
        $('#' + statBarId).find('div').append(prg);

        // If there was an error, quit
        if (rsp.length) {
            $('#' + loaderId).hide();
            if (builtInXCAT == 1) {
                $('#' + statBarId).find('div').append('<pre>(Error) Failed to update /etc/hosts</pre>');
            } else {
                $('#' + statBarId).find('div').append('<pre>(Error) Failed to makedns</pre>');
            }
        } else {
            if (builtInXCAT == 1) {
              $('#' + statBarId).find('div').append('<pre>/etc/hosts updated</pre>');
            } else {
                $('#' + statBarId).find('div').append('<pre>makedns updated</pre>');
            }

            // Set cookie for number of disks
            var diskRows = $('#' + tabId + ' table:eq(0):visible tbody tr');
            $.cookie('disks2add' + out2Id, diskRows.length);
            if (diskRows.length > 0) {
                for (var i = 0; i < diskRows.length; i++) {
                    var diskArgs = diskRows.eq(i).find('td');
                    var type = diskArgs.eq(1).find('select').val();
                    var address = diskArgs.eq(2).find('input').val();
                    var size = diskArgs.eq(3).find('input').val();
                    var mode = diskArgs.eq(4).find('select').val();
                    var pool = diskArgs.eq(5).find('select').val();
                    var password = diskArgs.eq(6).find('input').val();

                    // Create ajax arguments
                    var args = '';
                    if (type == '3390') {
                        args = '--add' + type + ';' + pool + ';' + address
                            + ';' + size + ';' + mode + ';' + password + ';'
                            + password + ';' + password;
                    } else if (type == '9336') {
                        args = '--add' + type + ';' + pool + ';' + address + ';'
                            + size + ';' + mode + ';' + password + ';'
                            + password + ';' + password;
                    }

                    // Attach disk to node
                    $.ajax({
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : node,
                            args : args,
                            msg : 'cmd=chvm-disk;out=' + out2Id
                        },

                        success : updateZProvisionNewStatus
                    });
                }
            }

            // Set cookie for number of zFCP devices
            var zfcpRows = $('#' + tabId + ' table:eq(1):visible tbody tr');
            $.cookie('zfcp2add' + out2Id, zfcpRows.length);
            if (zfcpRows.length > 0) {
                for ( var i = 0; i < zfcpRows.length; i++) {
                    var diskArgs = zfcpRows.eq(i).find('td');
                    var address = diskArgs.eq(1).find('input').val();
                    var size = diskArgs.eq(2).find('input').val();
                    var pool = diskArgs.eq(3).find('select').val();
                    var tag = diskArgs.eq(4).find('input').val();
                    var portName = diskArgs.eq(5).find('input').val();
                    var unitNo = diskArgs.eq(6).find('input').val();

                    // This is either true or false
                    var loaddev = diskArgs.eq(7).find('input').attr('checked');
                    if (loaddev) {
                        loaddev = "1";
                    } else {
                        loaddev = "0";
                    }

                    // Create ajax arguments
                    var args = '--addzfcp;' + pool + ';' + address + ';' + loaddev + ';' + size;
                    if (tag && tag != "null") {
                        args += ';' + tag;
                    } if (portName && tag != "null") {
                        args += ';' + portName;
                    } if (unitNo && tag != "null") {
                        args += ';' + unitNo;
                    }

                    // Attach zFCP device to node
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : node,
                            args : args,
                            msg : 'cmd=chvm-zfcp;out=' + out2Id
                        },

                        success : updateZProvisionNewStatus
                    });
                }
            }

            // Done if no disks to add
            if (diskRows.length < 1 && zfcpRows.length < 1) {
                $('#' + statBarId).find('div').append('<pre>No disks found to provison, finished.</pre>');
                $('#' + loaderId).hide();
            }
        }
    }

    /**
     * (6) Set operating system for given node
     */
    else if (lastCmd == 'chvm-disk' || lastCmd == 'chvm-zfcp') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');
        $('#' + statBarId).find('div').append(prg);

        // If there was an error, quit
        if (containErrors(prg.html())) {
            $('#' + loaderId).hide();
        } else {
            // Set cookie for number of disks
            // One less disk to add
            var disks2add = $.cookie('disks2add' + out2Id);
            if (lastCmd == 'chvm-disk') {
                if (disks2add > 0) {
                    disks2add--;
                    $.cookie('disks2add' + out2Id, disks2add);
                }
            }

            var zfcp2add = $.cookie('zfcp2add' + out2Id);
            if (lastCmd == 'chvm-zfcp') {
                if (zfcp2add > 0) {
                    zfcp2add--;
                    $.cookie('zfcp2add' + out2Id, zfcp2add);
                }
            }

            // Only set operating system if there are no more disks to add
            if (zfcp2add < 1 && disks2add < 1) {
                // If an operating system image is given
                var osImage = $('#' + tabId + ' select[name=os]:visible').val();
                if (osImage) {
                    // Get operating system, architecture, provision method, and profile
                    var tmp = osImage.split('-');
                    var os = tmp[0];
                    var arch = tmp[1];
                    var profile = tmp[3];

                    // If the last disk is added
                    $.ajax({
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'nodeadd',
                            tgt : '',
                            args : node + ';noderes.netboot=zvm;nodetype.os='
                                + os + ';nodetype.arch=' + arch
                                + ';nodetype.profile=' + profile,
                            msg : 'cmd=noderes;out=' + out2Id
                        },

                        success : updateZProvisionNewStatus
                    });
                } else {
                    $('#' + loaderId).hide();
                }
            }
        }
    }

    /**
     * (7) If sourceforge xCAT Update DHCP
     */
    else if ((lastCmd == 'noderes') && (builtInXCAT == 0)) {
        // If there was an error, do not continue
        if (rsp.length) {
            $('#' + loaderId).hide();
            $('#' + statBarId).find('div').append('<pre>(Error) Failed to set operating system</pre>');
        } else {
            $('#' + statBarId).find('div').append('<pre>Operating system for ' + node + ' set</pre>');
            $.ajax( {
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'makedhcp',
                    tgt : '',
                    args : '-a',
                    msg : 'cmd=makedhcp;out=' + out2Id
                },

                success : updateZProvisionNewStatus
            });
        }
    }

    /**
     * (8) Prepare node for boot
     */
    else if (((lastCmd == 'noderes') && (builtInXCAT == 1)) ||
             ((lastCmd == 'makedhcp') && (builtInXCAT == 0))) {
        // If there was an error, do not continue
        if (rsp.length) {
            $('#' + loaderId).hide();
            if (builtInXCAT == 1) {
                $('#' + statBarId).find('div').append('<pre>(Error) Failed to set operating system</pre>');
            } else {
                $('#' + statBarId).find('div').append('<pre>(Error) Failed to make dhcp</pre>');
            }
        } else {
            if (builtInXCAT == 1) {
                $('#' + statBarId).find('div').append('<pre>Operating system for ' + node + ' set</pre>');
            } else {
                $('#' + statBarId).find('div').append('<pre>DHCP for ' + node + ' set</pre>');
            }

            // Prepare node for boot
            $.ajax( {
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'nodeset',
                    tgt : node,
                    args : 'install',
                    msg : 'cmd=nodeset;out=' + out2Id
                },

                success : updateZProvisionNewStatus
            });
        }
    }

    /**
     * (9) Boot node to network
     */
    else if (lastCmd == 'nodeset') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');
        $('#' + statBarId).find('div').append(prg);

        // If there was an error
        // Do not continue
        if (containErrors(prg.html())) {
            $('#' + loaderId).hide();
        } else {
            $.ajax( {
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'rnetboot',
                    tgt : node,
                    args : 'ipl=000C',
                    msg : 'cmd=rnetboot;out=' + out2Id
                },

                success : updateZProvisionNewStatus
            });
        }
    }

    /**
     * (10) Done
     */
    else if (lastCmd == 'rnetboot') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');
        $('#' + statBarId).find('div').append(prg);
        if (prg.html().indexOf('Error') < 0) {
            $('#' + statBarId).find('div').append('<pre>Open a VNC viewer to see the installation progress.  It might take a couple of minutes before you can connect.</pre>');
        }

        // Hide loader
        $('#' + loaderId).hide();
    }
}

/**
 * Update the provision existing node status
 *
 * @param data Data returned from HTTP request
 */
function updateZProvisionExistingStatus(data) {
    // Get ajax response
    var rsp = data.rsp;
    var args = data.msg.split(';');

    // Get command invoked
    var cmd = args[0].replace('cmd=', '');
    // Get provision tab instance
    var inst = args[1].replace('out=', '');
    if (typeof console == "object"){
          console.log("Entering updateZProvisionExistingStatus. Last command:<"+cmd+"> All args:<"+args+">");
    }

    // Get provision tab and status bar ID
    var statBarId = 'zProvisionStatBar' + inst;
    var tabId = 'zvmProvisionTab' + inst;

    /**
     * (2) Prepare node for boot
     */
    if (cmd == 'nodeadd') {
        // Get operating system
        var bootMethod = $('#' + tabId + ' select[name=bootMethod]').val();

        // Get nodes that were checked
        var dTableId = 'zNodesDatatable' + inst;
        var tgts = getNodesChecked(dTableId);

        // Prepare node for boot
        $.ajax( {
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'nodeset',
                tgt : tgts,
                args : bootMethod,
                msg : 'cmd=nodeset;out=' + inst
            },

            success : updateZProvisionExistingStatus
        });
    }

    /**
     * (3) Boot node from network
     */
    else if (cmd == 'nodeset') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');
        $('#' + statBarId).find('div').append(prg);

        // If there was an error, do not continue
        if (containErrors(prg.html())) {
            var loaderId = 'zProvisionLoader' + inst;
            $('#' + loaderId).remove();
            return;
        }

        // Get nodes that were checked
        var dTableId = 'zNodesDatatable' + inst;
        var tgts = getNodesChecked(dTableId);

        // Boot node from network
        $.ajax( {
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'rnetboot',
                tgt : tgts,
                args : 'ipl=000C',
                msg : 'cmd=rnetboot;out=' + inst
            },

            success : updateZProvisionExistingStatus
        });
    }

    /**
     * (4) Done
     */
    else if (cmd == 'rnetboot') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');
        $('#' + statBarId).find('div').append(prg);
        if (prg.html().indexOf('Error') < 0) {
            $('#' + statBarId).find('div').append('<pre>Open a VNC viewer to see the installation progress.  It might take a couple of minutes before you can connect.</pre>');
        }

        var loaderId = 'zProvisionLoader' + inst;
        $('#' + loaderId).remove();
    }
}

/**
 * Update zVM node status
 *
 * @param data Data returned from HTTP request
 */
function updateZNodeStatus(data) {
    var node = data.msg;
    var rsp = data.rsp;

    // Get cookie for number processes performed against this node
    var actions = $.cookie(node + 'processes');
    // One less process
    actions = actions - 1;
    $.cookie(node + 'processes', actions);

    if (actions < 1) {
        // Hide loader when there are no more processes
        var statusBarLoaderId = node + 'StatusBarLoader';
        $('#' + statusBarLoaderId).hide();
    }

    var statBarId = node + 'StatusBar';

    // Write ajax response to status bar
    var prg = writeRsp(rsp, node + ': ');
    $('#' + statBarId).find('div').append(prg);
}

/**
 * Update clone status
 *
 * @param data Data returned from HTTP request
 */
function updateZCloneStatus(data) {
    // Get ajax response
    var rsp = data.rsp;
    var args = data.msg.split(';');
    var cmd = args[0].replace('cmd=', '');

    // Get provision instance
    var inst = args[1].replace('inst=', '');
    // Get output division ID
    var out2Id = args[2].replace('out=', '');

    /**
     * (2) Update /etc/hosts
     */
    if (cmd == 'nodeadd') {
        var node = args[3].replace('node=', '');

        // If there was an error, do not continue
        if (rsp.length) {
            $('#' + out2Id).find('img').hide();
            $('#' + out2Id).find('div').append('<pre>(Error) Failed to create node definition</pre>');
        } else {
            $('#' + out2Id).find('div').append('<pre>Node definition created for ' + node + '</pre>');

            // If last node definition was created
            var tmp = inst.split('/');
            if (tmp[0] == tmp[1]) {
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'makehosts',
                        tgt : '',
                        args : '',
                        msg : 'cmd=makehosts;inst=' + inst + ';out=' + out2Id
                    },

                    success : updateZCloneStatus
                });
            }
        }
    }

    /**
     * (3a) Update DNS if source forge xCAT then do makedns
     */
    else if ((cmd == 'makehosts') && (builtInXCAT == 0)) {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');
        $('#' + out2Id).find('div').append(prg);

        // If there was an error, do not continue
        if (rsp.length) {
            $('#' + out2Id).find('img').hide();
            $('#' + out2Id).find('div').append('<pre>(Error) Failed to update /etc/hosts</pre>');
        } else {
            $('#' + out2Id).find('div').append('<pre>/etc/hosts updated</pre>');
            $.ajax( {
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'makedns',
                    tgt : '',
                    args : '',
                    msg : 'cmd=makedns;inst=' + inst + ';out=' + out2Id
                },

                success : updateZCloneStatus
            });
        }
    }

    /**
     * (3b) Update DNS for built in xCAT and clone
     *  Just clone for sourceforge xCAT
     */
    else if (((cmd == 'makehosts') && (builtInXCAT == 1)) ||
             ((cmd == 'makedns') && (builtInXCAT == 0))) {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');
        $('#' + out2Id).find('div').append(prg);

        // If there was an error, do not continue
        if (rsp.length) {
            $('#' + out2Id).find('img').hide();
            if (builtInXCAT == 1) {
                $('#' + out2Id).find('div').append('<pre>(Error) Failed to update /etc/hosts</pre>');
            } else {
                $('#' + out2Id).find('div').append('<pre>(Error) Failed to makedns</pre>');
            }
        }
        // Get clone tab
        var tabId = out2Id.replace('CloneStatusBar', 'CloneTab');

        // If a node range is given
        var tgtNodeRange = $('#' + tabId + ' input[name=tgtNode]').val();
        var tgtNodes = '';
        if (tgtNodeRange.indexOf('-') > -1) {
            var tmp = tgtNodeRange.split('-');

            // Get node base name
            var nodeBase = tmp[0].match(/[a-zA-Z]+/);
            // Get the starting index
            var nodeStart = parseInt(tmp[0].match(/\d+/));
            // Get the ending index
            var nodeEnd = parseInt(tmp[1].match(/\d+/));
            for ( var i = nodeStart; i <= nodeEnd; i++) {
                // Do not append comma for last node
                if (i == nodeEnd) {
                    tgtNodes += nodeBase + i.toString();
                } else {
                    tgtNodes += nodeBase + i.toString() + ',';
                }
            }
        } else {
            tgtNodes = tgtNodeRange;
        }

        // Get other inputs
        var srcNode = $('#' + tabId + ' input[name=srcNode]').val();
        hcp = $('#' + tabId + ' input[name=newHcp]').val();
        var group = $('#' + tabId + ' input[name=newGroup]').val();
        var diskPool = $('#' + tabId + ' input[name=diskPool]').val();
        var diskPw = $('#' + tabId + ' input[name=diskPw]').val();
        if (!diskPw) {
            diskPw = '';
        }

        // Clone
        $.ajax( {
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'mkvm',
                tgt : tgtNodes,
                args : srcNode + ';pool=' + diskPool + ';pw=' + diskPw,
                msg : 'cmd=mkvm;inst=' + inst + ';out=' + out2Id
            },
            error: function(jqXHR, textStatus) {
                $('#' + out2Id).find('div').append('<pre>(Error) Failed in clone call with ' + textStatus + '</pre>');
            },
            success : updateZCloneStatus
        });
    }

    /**
     * (5) Done
     */
    else if (cmd == 'mkvm') {
        // Write ajax response to status bar
        var prg = writeRsp(rsp, '');
        $('#' + out2Id).find('div').append(prg);

        // Hide loader
        $('#' + out2Id).find('img').hide();
    }
}

/**
 * Get zVM resources
 *
 * @param data Data from HTTP request
 */
function getZResources(data) {
    var tabId = 'zvmResourceTab';
    var info = createInfoBar('Manage storage and networks');
    $('#' + tabId).append(info);

    // Do not continue if there is no output
    if (data.rsp.length) {
        if (typeof console == "object"){
            console.log("Entering getZResources.");
        }
        // Push hardware control points into an array
        var node, hcp;
        var hcpHash = new Object();
        var hostnameHash = new Object();
        for (var i in data.rsp) {
            node = data.rsp[i][0];
            hcp = data.rsp[i][1];
            // data will be coming in like "xcat xcat.endicott.ibm.com hosts.hostnames"
            // or xcat zhcp.endicott.ibm.com zvm.hcp"
            if (data.rsp[i][2]== "zvm.hcp") {
                hcpHash[hcp] = 1;
            } else {
                if (hcp.length) {
                    hostnameHash[hcp] = node;
                }
            }
        }

        // Create an array for hardware control points
        var hcps = new Array();
        for (var key in hcpHash) {
            // Get the short host name
            //hcp = key.split('.')[0]; //old code
            hcp = hostnameHash[key];
            if (typeof console == "object"){
                console.log("getZResources lookup for hostname "+key+" found nodename <"+hcp+">");
            }
            if (jQuery.inArray(hcp, hcps) == -1) {
                hcps.push(hcp);
            }
        }

        // Set hardware control point cookie
        $.cookie('hcp', hcps);

        // Delete loader
        $('#' + tabId).find('img[src="images/loader.gif"]').remove();

        // Create accordion panel for disk
        var resourcesAccordion = $('<div id="zvmResourceAccordion"></div>');
        var diskSection = $('<div id="zvmDiskResource"></div>');
        var diskLnk = $('<h3><a href="#">Disks</a></h3>').click(function () {
            // Do not load panel again if it is already loaded
            if ($('#zvmDiskResource').children().length) {
                return;
            }
            else
                $('#zvmDiskResource').append(createLoader(''));

            // Resize accordion
            $('#zvmResourceAccordion').accordion('resize');

            // Create a array for hardware control points
            var hcps = new Array();
            if ($.cookie('hcp').indexOf(',') > -1) {
                hcps = $.cookie('hcp').split(',');
            } else {
                hcps.push($.cookie('hcp'));
            }

            // Query the disk pools for each hcp
            var panelId = 'zvmDiskResource';
            var info = $('#' + panelId).find('.ui-state-highlight');
            if (!info.length) {
                info = createInfoBar("Querying "+hcps.length+" zhcp(s) for disk pools.");
                $('#' + panelId).append(info);
            }
            zhcpQueryCountForDisks = hcps.length;

            for (var i in hcps) {
                var itemcount = +i + 1;
                info.append("<br>Querying disk pools from: "+hcps[i]+" ("+itemcount+" of "+hcps.length+")");
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcps[i],
                        args : '--diskpoolnames',
                        msg : hcps[i]
                    },

                    success : getDiskPool
                });
                zhcpQueryCountForDisks--;
            }
        });

        // Create accordion panel for zFCP devices
        var zfcpSection = $('<div id="zfcpResource"></div>');
        var zfcpLnk = $('<h3><a href="#">zFCP</a></h3>').click(function () {
            // Do not load panel again if it is already loaded
            if ($('#zfcpResource').children().length)
                return;
            else
                $('#zfcpResource').append(createLoader(''));

            // Resize accordion
            $('#zvmResourceAccordion').accordion('resize');

            // Create a array for hardware control points
            var hcps = new Array();
            if ($.cookie('hcp').indexOf(',') > -1) {
                hcps = $.cookie('hcp').split(',');
            } else {
                hcps.push($.cookie('hcp'));

            }

            // Query the fcp pools for each hcp
            var panelId = 'zfcpResource';
            var info = $('#' + panelId).find('.ui-state-highlight');
            if (!info.length) {
                info = createInfoBar("Querying "+hcps.length+" zhcp(s) for fcp pools.");
                $('#' + panelId).append(info);
            }
            zhcpQueryCountForZfcps = hcps.length;
            for (var i in hcps) {
                // Gather fcp pools from hardware control points
                var itemcount = +i + 1;
                info.append("<br>Querying fcp pools from: "+hcps[i]+" ("+itemcount+" of "+hcps.length+")");
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcps[i],
                        args : '--zfcppoolnames',
                        msg : hcps[i]
                    },

                    success : getZfcpPool
                });
                zhcpQueryCountForZfcps--;
            }
        });

        // Create accordion panel for network
        var networkSection = $('<div id="zvmNetworkResource"></div>');
        var networkLnk = $('<h3><a href="#">Networks</a></h3>').click(function () {
            // Do not load panel again if it is already loaded
            if ($('#zvmNetworkResource').children().length) {
                return;
            } else {
                $('#zvmNetworkResource').append(createLoader(''));
            }

            // Resize accordion
            $('#zvmResourceAccordion').accordion('resize');

            // Create a array for hardware control points
            var hcps = new Array();
            if ($.cookie('hcp').indexOf(',') > -1) {
                hcps = $.cookie('hcp').split(',');
            } else {
                hcps.push($.cookie('hcp'));

            }
            // Query the networks for each
            var panelId = 'zvmNetworkResource';
            var info = $('#' + panelId).find('.ui-state-highlight');
            if (!info.length) {
                info = createInfoBar("Querying "+hcps.length+" zhcp(s) for networks.");
                $('#' + panelId).append(info);
            }
            zhcpQueryCountForNetworks = hcps.length;
            for (var i in hcps) {
                var itemcount = +i + 1;
                info.append("<br>Querying networks from: "+hcps[i]+" ("+itemcount+" of "+hcps.length+")");
                $('#zvmResourceAccordion').accordion('resize');
                // Gather networks from hardware control points
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcps[i],
                        args : '--getnetworknames',
                        msg : hcps[i]
                    },

                    success : getNetwork
                });
                zhcpQueryCountForNetworks--;
            }
        });

        resourcesAccordion.append(diskLnk, diskSection, zfcpLnk, zfcpSection, networkLnk, networkSection);

        // Append accordion to tab
        $('#' + tabId).append(resourcesAccordion);
        resourcesAccordion.accordion();
        networkLnk.trigger('click');
    }
}

/**
 * Get node attributes from HTTP request data
 *
 * @param propNames Hash table of property names
 * @param keys Property keys
 * @param data Data from HTTP request
 * @return Hash table of property values
 */
function getAttrs(keys, propNames, data) {
    // Create hash table for property values
    var attrs = new Object();

    // Go through inventory and separate each property out
    var curKey = null; // Current property key
    var addLine; // Add a line to the current property?
    for ( var i = 1; i < data.length; i++) {
        addLine = true;

        // Loop through property keys
        // Does this line contains one of the properties?
        for ( var j = 0; j < keys.length; j++) {
            // Find property name
            if (data[i].indexOf(propNames[keys[j]]) > -1) {
                attrs[keys[j]] = new Array();

                // Get rid of property name in the line
                data[i] = data[i].replace(propNames[keys[j]], '');
                // Trim the line
                data[i] = jQuery.trim(data[i]);

                // Do not insert empty line
                if (data[i].length > 0) {
                    attrs[keys[j]].push(data[i]);
                }

                curKey = keys[j];
                addLine = false; // This line belongs to a property
            }
        }

        // Line does not contain a property
        // Must belong to previous property
        if (addLine && data[i].length > 1) {
            data[i] = jQuery.trim(data[i]);
            attrs[curKey].push(data[i]);
        }
    }

    return attrs;
}

/**
 * Create add processor dialog
 *
 * @param node Node to add processor to
 */
function openAddProcDialog(node) {
    // Create form to add processor
    var addProcForm = $('<div class="form"></div>');
    // Create info bar
    var info = createInfoBar('Add a temporary processor to this virtual server.');
    addProcForm.append(info);
    addProcForm.append('<div><label>Node:</label><input type="text" readonly="readonly" id="procNode" name="procNode" value="' + node + '" title="The node name"/></div>');
    addProcForm.append('<div><label>Processor address:</label><input type="text" id="procAddress" name="procAddress" title="The processor address. The processor address can be any value from 0 to 3F."/></div>');

    // Create drop down for processor type
    var procType = $('<div></div>');
    procType.append('<label>Processor type:</label>');
    var typeSelect = $('<select name="procType" title="The type of virtual CPU being defined"></select>');
    typeSelect.append('<option>CP</option>'
        + '<option>IFL</option>'
        + '<option>ZAAP</option>'
        + '<option>ZIIP</option>'
    );
    procType.append(typeSelect);
    addProcForm.append(procType);

    // Generate tooltips
    addProcForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add processor
    addProcForm.dialog({
        title:'Add processor',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 400,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                // Get inputs
                var node = $(this).find('input[name=procNode]').val();
                var address = $(this).find('input[name=procAddress]').val();
                var type = $(this).find('select[name=procType]').val();

                // If inputs are not complete, show warning message
                if (!node || !address || !type) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Add processor
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : node,
                            args : '--addprocessoractive;' + address + ';' + type,
                            msg : node
                        },

                        success : updateZNodeStatus
                    });

                    // Increment node process
                    incrementNodeProcess(node);

                    // Show loader
                    var statusId = node + 'StatusBar';
                    var statusBarLoaderId = node + 'StatusBarLoader';
                    $('#' + statusBarLoaderId).show();
                    $('#' + statusId).show();

                    // Close dialog
                    $(this).dialog( "close" );
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create add disk dialog
 *
 * @param node Node to add disk to
 * @param hcp Hardware control point of node
 */
function openAddDiskDialog(node, hcp) {
    // Get list of disk pools
    var cookie = $.cookie(hcp + 'diskpools');
    var pools = new Array();
    if (cookie) {
        pools = cookie.split(',');
    }

    // Create form to add disk
    var addDiskForm = $('<div class="form"></div>');
    // Create info bar
    var info = createInfoBar('Add a ECKD|3390 or FBA|9336 disk to this virtual server.');
    addDiskForm.append(info);
    addDiskForm.append('<div><label>Node:</label><input type="text" readonly="readonly" name="diskNode" value="' + node + '" title="The node name"/></div>');
    addDiskForm.append('<div><label>Disk type:</label><select name="diskType" title="The device type of the volume to which the disk is assigned"><option value="3390">3390</option><option value="9336">9336</option></select></div>');
    addDiskForm.append('<div><label>Disk address:</label><input type="text" name="diskAddress" title="The virtual device address of the disk to be added"/></div>');
    addDiskForm.append('<div><label>Disk size:</label><input type="text" name="diskSize" title="The size of the disk to be added. The size can be in G, M, or number of blocks or cylinders. For example, 6G, 6144M, or 10016."/></div>');

    // Create drop down for disk pool
    var diskPool = $('<div></div>');
    diskPool.append('<label>Disk pool:</label>');
    var poolSelect = $('<select id="diskPool" name="diskPool" title="The pool where the new disk is to be found"></select>');
    for ( var i = 0; i < pools.length; i++) {
        if( !pools[i] || 0 === pools[i].length) continue;
        poolSelect.append('<option>' + pools[i] + '</option>');
    }
    diskPool.append(poolSelect);
    addDiskForm.append(diskPool);

    // Create drop down for disk mode
    var diskMode = $('<div></div>');
    diskMode.append('<label>Disk mode:</label>');
    var modeSelect = $('<select id="diskMode" name="diskMode" title="The access mode for the disk"></select>');
    modeSelect.append('<option>R</option>'
        + '<option>RR</option>'
        + '<option>W</option>'
        + '<option>WR</option>'
        + '<option>M</option>'
        + '<option>MR</option>'
        + '<option>MW</option>'
    );
    diskMode.append(modeSelect);
    addDiskForm.append(diskMode);

    addDiskForm.append('<div><label>Disk password:</label><input type="password" id="diskPassword" name="diskPassword" title="Optional. Defines the read, write, and multi password that will be used for accessing the disk."/></div>');

    // Generate tooltips
    addDiskForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add disk
    addDiskForm.dialog({
        title:'Add disk',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 400,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                // Get inputs
                var node = $(this).find('input[name=diskNode]').val();
                var type = $(this).find('select[name=diskType]').val();
                var address = $(this).find('input[name=diskAddress]').val();
                var size = $(this).find('input[name=diskSize]').val();
                var pool = $(this).find('select[name=diskPool]').val();
                var mode = $(this).find('select[name=diskMode]').val();
                var password = $(this).find('input[name=diskPassword]').val();

                // If inputs are not complete, show warning message
                if (!node || !type || !address || !size || !pool || !mode) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Add disk
                    if (type == '3390') {
                        $.ajax( {
                            url : 'lib/cmd.php',
                            dataType : 'json',
                            data : {
                                cmd : 'chvm',
                                tgt : node,
                                args : '--add3390;' + pool + ';' + address + ';' + size
                                    + ';' + mode + ';' + password + ';' + password + ';' + password,
                                msg : node
                            },

                            success : updateZNodeStatus
                        });

                        // Increment node process
                        incrementNodeProcess(node);

                        // Show loader
                        var statusId = node + 'StatusBar';
                        var statusBarLoaderId = node + 'StatusBarLoader';
                        $('#' + statusBarLoaderId).show();
                        $('#' + statusId).show();
                    } else if (type == '9336') {
                        // Default block size for FBA volumes = 512

                        $.ajax( {
                            url : 'lib/cmd.php',
                            dataType : 'json',
                            data : {
                                cmd : 'chvm',
                                tgt : node,
                                args : '--add9336;' + pool + ';' + address + ';' + size
                                    + ';' + mode + ';' + password + ';' + password + ';' + password,
                                msg : node
                            },

                            success : updateZNodeStatus
                        });

                        // Increment node process
                        incrementNodeProcess(node);

                        // Show loader
                        var statusId = node + 'StatusBar';
                        var statusBarLoaderId = node + 'StatusBarLoader';
                        $('#' + statusBarLoaderId).show();
                        $('#' + statusId).show();
                    }

                    // Close dialog
                    $(this).dialog( "close" );
                } // End of else
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create add zFCP device dialog
 *
 * @param node Node to add disk to
 * @param hcp Hardware control point of node
 * @param zvm The z/VM system of node
 */
function openAddZfcpDialog(node, hcp, zvm) {
    // Get list of disk pools
    var cookie = $.cookie(hcp + 'zfcppools');
    var pools = new Array();
    if (cookie) {
        pools = cookie.split(',');
    }

    // Create form to add disk
    var addZfcpForm = $('<div class="form"></div>');
    // Create info bar
    var info = createInfoBar('Add a SCSI|FCP disk to this virtual server.');
    addZfcpForm.append(info);
    addZfcpForm.append('<div><label>Node:</label><input type="text" readonly="readonly" name="diskNode" value="' + node + '" title="The node name"/></div>');
    addZfcpForm.append('<div><label>Disk address:</label><input type="text" name="diskAddress" title="The virtual address of the dedicated FCP device channel"/></div>');
    addZfcpForm.append('<div><label>LOADDEV:</label><input type="checkbox" name="diskLoaddev" title="Set the SCSI disk as the device to be loaded on IPL"/></div>');
    addZfcpForm.append('<div><label>Disk size:</label><input type="text" name="diskSize" title="The size of the disk to be added. The size can be in G or M. For example, 2G or 2048M."/></div>');

    // Create drop down for disk pool
    var diskPool = $('<div></div>');
    diskPool.append('<label>Disk pool:</label>');
    var poolSelect = $('<select name="diskPool" title="The pool where the new disk is to be found"></select>');
    for ( var i = 0; i < pools.length; i++) {
        if( !pools[i] || 0 === pools[i].length) continue;
        poolSelect.append('<option>' + pools[i] + '</option>');
    }
    diskPool.append(poolSelect);
    addZfcpForm.append(diskPool);

    // Tag to identify where device will be used
    addZfcpForm.append('<div><label>Disk tag:</label><input type="text" name="diskTag" title="The tag specified in the autoyast or kickstart template, defining how the SCSI disk is to be used."/></div>');

    // Create advanced link to set advanced zFCP properties
    var advancedLnk = $('<div><label><a style="color: blue; cursor: pointer;">Advanced</a></label></div>');
    addZfcpForm.append(advancedLnk);
    var advanced = $('<div style="margin-left: 20px;"></div>').hide();
    addZfcpForm.append(advanced);

    var portName = $('<div><label>Port name:</label><input type="text" name="diskPortName" title="The hexadecimal digits designating the 8-byte fibre channel port name of the FCP-I/O device"/></div>');
    var unitNo = $('<div><label>Unit number:</label><input type="text" name="diskUnitNo" title="The hexadecimal digits representing the 8-byte logical unit number of the FCP-I/O device"/></div>');
    advanced.append(portName, unitNo);

    // Toggle port name and unit number when clicking on advanced link
    advancedLnk.click(function() {
        advanced.toggle();
    });

    // Generate tooltips
    addZfcpForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add disk
    addZfcpForm.dialog({
        title:'Add zFCP device',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 400,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                // Get inputs
                var node = $(this).find('input[name=diskNode]').val();
                var address = $(this).find('input[name=diskAddress]').val();
                var loaddev = $(this).find('input[name=diskLoaddev]');
                var size = $(this).find('input[name=diskSize]').val();
                var pool = $(this).find('select[name=diskPool]').val();
                var tag = $(this).find('input[name=diskTag]').val();
                var portName = $(this).find('input[name=diskPortName]').val();
                var unitNo = $(this).find('input[name=diskUnitNo]').val();

                // If inputs are not complete, show warning message
                if (!node || !address || !size || !pool) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    if (loaddev.attr('checked')) {
                        loaddev = 1;
                    } else {
                        loaddev = 0;
                    }

                    var args = '--addzfcp||' + pool + '||' + address + '||' + loaddev + '||' + size;

                    if (tag && tag != "null") {
                        args += '||' + tag;
                    } else {
                        args += '|| ""';
                    }

                    if ((portName && portName != "null") && (unitNo && unitNo != "null")) {
                        args += '||' + portName + '||' + unitNo;
                    }

                    // Add zFCP device
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : node,
                            args : args,
                            msg : node
                        },

                        success : updateZNodeStatus
                    });

                    // Increment node process
                    incrementNodeProcess(node);

                    // Show loader
                    var statusId = node + 'StatusBar';
                    var statusBarLoaderId = node + 'StatusBarLoader';
                    $('#' + statusBarLoaderId).show();
                    $('#' + statusId).show();

                    // Close dialog
                    $(this).dialog( "close" );
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create dedicate device dialog
 *
 * @param node Node to dedicate device to
 * @param hcp Hardware control point of node
 */
function openDedicateDeviceDialog(node, hcp) {
    // Create form to add disk
    var dedicateForm = $('<div class="form"></div>');
    // Create info bar
    var info = createInfoBar('Add a dedicated device to the configuration');
    dedicateForm.append(info);

    dedicateForm.append('<div><label>Node:</label><input type="text" readonly="readonly" name="diskNode" value="' + node + '" title="The node name"/></div>');
    dedicateForm.append('<div><label>Virtual device address:</label><input type="text" name="virtualAddress" title=" The virtual device number of the device"/></div>');
    dedicateForm.append('<div><label>Real device address:</label><input type="test" name="realAddress" title=" A real device number to be dedicated or attached to the specified virtual machine"/></div>');
    dedicateForm.append('<div><label>Mode:</label><select name="mode" title="Specifies if the virtual device is to be in read-only or read-write mode">' +
            '<option value="0">Read-write</option>' +
            '<option value="1">Read-only</option>' +
        '</select>');

    // Generate tooltips
    dedicateForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add dedicated device
    dedicateForm.dialog({
        title:'Add dedicated device',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 400,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                // Get inputs
                var node = $(this).find('input[name=diskNode]').val();
                var vAddress = $(this).find('input[name=virtualAddress]').val();
                var rAddress = $(this).find('input[name=realAddress]').val()
                var mode = $(this).find('select[name=mode]').val();

                // If inputs are not complete, show warning message
                if (!node || !vAddress || !rAddress || !mode) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    var args = '--dedicatedevice;' + vAddress + ';' + rAddress + ';' + mode;

                    // Add zFCP device
                    $.ajax( {
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chvm',
                            tgt : node,
                            args : args,
                            msg : node
                        },

                        success : updateZNodeStatus
                    });

                    // Increment node process
                    incrementNodeProcess(node);

                    // Show loader
                    var statusId = node + 'StatusBar';
                    var statusBarLoaderId = node + 'StatusBarLoader';
                    $('#' + statusBarLoaderId).show();
                    $('#' + statusId).show();

                    // Close dialog
                    $(this).dialog( "close" );
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create add ECKD to system dialog
 *
 * @param hcp Hardware control point of node
 */
function openAddEckd2SystemDialog(hcp) {
    var dialogId = 'zvmAddEckd2System';

    // Create form to add disk
    var addE2SForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Obtain mapping for zHCP to zVM system
    var hcp2zvm = new Object();
    hcp2zvm = getHcpZvmHash();

    var system = $('<div><label>z/VM system:</label></div>');
    var systemSelect = $('<select name="system" title="The z/VM system name"></select>');
    system.append(systemSelect);

    // Append options for hardware control points
    //systemSelect.append($('<option value=""></option>'));
    for (var hcp in hcp2zvm) {
        systemSelect.append($('<option value="' + hcp2zvm[hcp] + '">' + hcp2zvm[hcp] + '</option>'));
    }

    // Create info bar
    var info = createInfoBar('Dynamically add an ECKD disk to a running z/VM system.');
    addE2SForm.append(info);

    addE2SForm.append(system);
    addE2SForm.append('<div><label>Device number:</label><input type="text" name="devNum" value="" maxlength="4" title="The disk device number"/></div>');

    // Generate tooltips
    addE2SForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add disk
    addE2SForm.dialog({
        title:'Add ECKD to system',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 420,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                var system = $(this).find('select[name=system]').val();
                var devnum = $(this).find('input[name=devNum]').val();

                // If inputs are not complete, show warning message
                var ready = true;
                var args = new Array('select[name=system]', 'input[name=devNum]');
                for (var i in args) {
                    if (!$(this).find(args[i]).val()) {
                        $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                        ready = false;
                    } else {
                        $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                    }
                }

                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar('Please provide a value for each required field.');
                    warn.prependTo($(this));
                    return;
                }

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'chhypervisor',
                        tgt : system,
                        args : "--addeckd;" + devnum,
                        msg : dialogId
                    },

                    success : updateResourceDialog
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create add Volume to system dialog
 *
 * @param hcp Hardware control point of node
 */
function openAddVolume2SystemDialog(hcp) {
    var dialogId = 'zvmAddVolume2System';

    // Create form to add volume
    var addV2SForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Obtain mapping for zHCP to zVM system
    var hcp2zvm = new Object();
    hcp2zvm = getHcpZvmHash();

    var system = $('<div><label>z/VM system:</label></div>');
    var systemSelect = $('<select name="system" title="The z/VM system name"></select>');
    system.append(systemSelect);

    // Append options for hardware control points
    //systemSelect.append($('<option value=""></option>'));
    for (var hcp in hcp2zvm) {
        systemSelect.append($('<option value="' + hcp2zvm[hcp] + '">' + hcp2zvm[hcp] + '</option>'));
    }

    // Create info bar
    var info = createInfoBar('Permanently add a volume to the z/VM system configuration.');
    addV2SForm.append(info);

    addV2SForm.append(system);
    addV2SForm.append('<div><label>Device address:</label><input type="text" name="devNum" value="" maxlength="4" title="The real device address of the disk"/></div>');
    addV2SForm.append('<div><label>Volume label:</label><input type="text" name="volser" value="" maxlength="6" title="The volume label to assign to the disk"/></div>');

    // Generate tooltips
    addV2SForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add volume
    addV2SForm.dialog({
        title:'Add volume to system configuration',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 480,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                var system = $(this).find('select[name=system]').val();
                var devnum = $(this).find('input[name=devNum]').val();
                var volser = $(this).find('input[name=volser]').val();

                // If inputs are not complete, show warning message
                var ready = true;
                var args = new Array('select[name=system]', 'input[name=devNum]', 'input[name=volser]' );
                for (var i in args) {
                    if (!$(this).find(args[i]).val()) {
                        $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                        ready = false;
                    } else {
                        $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                    }
                }

                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar('Please provide a value for each required field.');
                    warn.prependTo($(this));
                    return;
                }

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'chhypervisor',
                        tgt : system,
                        args : "--addvolume;" + devnum + ";" + volser,
                        msg : dialogId
                    },

                    success : updateResourceDialog
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create remove Volume to system dialog
 *
 * @param hcp Hardware control point of node
 */
function openRemoveVolumeFromSystemDialog(hcp) {
    var dialogId = 'zvmRemoveVolumeFromSystem';

    // Create form to remove volume
    var remVfromSForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Obtain mapping for zHCP to zVM system
    var hcp2zvm = new Object();
    hcp2zvm = getHcpZvmHash();

    var system = $('<div><label>z/VM system:</label></div>');
    var systemSelect = $('<select name="system" title="The z/VM system name"></select>');
    system.append(systemSelect);

    // Append options for hardware control points
    //systemSelect.append($('<option value=""></option>'));
    for (var hcp in hcp2zvm) {
        systemSelect.append($('<option value="' + hcp2zvm[hcp] + '">' + hcp2zvm[hcp] + '</option>'));
    }

    // Create info bar
    var info = createInfoBar('Permanently remove a volume from the z/VM system configuration.');
    remVfromSForm.append(info);

    remVfromSForm.append(system);
    remVfromSForm.append('<div><label>Device address:</label><input type="text" name="devNum" value="" maxlength="4" title="The real device address of the disk"/></div>');
    remVfromSForm.append('<div><label>Volume label:</label><input type="text" name="volser" value="" maxlength="6" title="The current volume label of the disk"/></div>');

    // Generate tooltips
    remVfromSForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to remove volume
    remVfromSForm.dialog({
        title:'Remove volume from system configuration',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 580,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                var system = $(this).find('select[name=system]').val();
                var devnum = $(this).find('input[name=devNum]').val();
                var volser = $(this).find('input[name=volser]').val();

                // If inputs are not complete, show warning message
                var ready = true;
                var args = new Array('select[name=system]', 'input[name=devNum]', 'input[name=volser]' );
                for (var i in args) {
                    if (!$(this).find(args[i]).val()) {
                        $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                        ready = false;
                    } else {
                        $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                    }
                }

                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar('Please provide a value for each required field.');
                    warn.prependTo($(this));
                    return;
                }

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'chhypervisor',
                        tgt : system,
                        args : "--removevolume;" + devnum + ";" + volser,
                        msg : dialogId
                    },

                    success : updateResourceDialog
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create add page or spool dialog
 *
 * @param hcp Hardware control point of node
 */
function openAddPageSpoolDialog(hcp) {
    var dialogId = 'zvmAddPageSpool';

    // Create form to add disk
    var addPageSpoolForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Obtain mapping for zHCP to zVM system
    var hcp2zvm = new Object();
    hcp2zvm = getHcpZvmHash();

    var system = $('<div><label>z/VM system:</label></div>');
    var systemSelect = $('<select name="system" title="The z/VM system name"></select>');
    system.append(systemSelect);
    // Append options for hardware control points
    //systemSelect.append($('<option value=""></option>'));
    for (var hcp in hcp2zvm) {
        systemSelect.append($('<option value="' + hcp2zvm[hcp] + '">' + hcp2zvm[hcp] + '</option>'));
    }

    // Create info bar
    var info = createInfoBar('Add a page or spool volume to be used by zVM.');
    addPageSpoolForm.append(info);

    var diskFS = $('<fieldset><legend>Disk</legend></fieldset>');
    addPageSpoolForm.append(diskFS);
    var diskAttr = $('<div style="display: inline-table; vertical-align: middle;"></div>');
    diskFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/hdd.png"></img></div>'));
    diskFS.append(diskAttr);

    diskAttr.append(system);
    diskAttr.append('<div><label>Volume address:</label><input type="text" name="volAddr" value="" maxlength="4" title="The real address of the volume to be used for page or spool space"/></div>');
    diskAttr.append('<div><label>Volume label:</label><input type="text" name="volLabel" value="" maxlength="6" title="The name to be associated with the newly formatted volume"/></div>');
    diskAttr.append('<div><label>Volume use:</label><select name="volUse" title="Specifies that the volume is to be formatted and used as a page or spool volume"><option value="PAGE">Page</option><option value="SPOOL">Spool</option></select></div>');

    // Generate tooltips
    addPageSpoolForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add disk
    addPageSpoolForm.dialog({
        title:'Add page or spool',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 500,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                var system = $(this).find('select[name=system]').val();
                var volAddr = $(this).find('input[name=volAddr]').val();
                var volLabel = $(this).find('input[name=volLabel]').val();
                var volUse = $(this).find('select[name=volUse]').val();

                // If inputs are not complete, show warning message
                var ready = true;
                var args = new Array('select[name=system]', 'input[name=volAddr]', 'input[name=volLabel]', 'select[name=volUse]');
                for (var i in args) {
                    if (!$(this).find(args[i]).val()) {
                        $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                        ready = false;
                    } else {
                        $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                    }
                }

                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar('Please provide a value for each required field.');
                    warn.prependTo($(this));
                    return;
                }

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                var pageSpoolArgs = volAddr + ";" + volLabel + ";" + volUse;

                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'chvm',
                        tgt : system,
                        args : '--addpagespool;' + pageSpoolArgs,
                        msg : dialogId
                    },

                    success : updateResourceDialog
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to share disk
 *
 * @param disks2share Disks selected in table
 */
function openShareDiskDialog(disks2share) {
    // Create form to share disk
    var dialogId = 'zvmShareDisk';
    var shareDiskForm = $('<div id="' + dialogId + '" class="form"></div>');

    var args = disks2share.split(';');
    var tgtHcp = args[0];
    var tgtVol = args[1];

    if (!tgtVol || tgtVol == "undefined")
        tgtVol = "";

    // Create info bar
    var info = createInfoBar('Indicate a full-pack minidisk is to be shared by the users of many real and virtual systems.');
    shareDiskForm.append(info);

    // Set region input based on those selected on table (if any)
    var node = $('<div><label>Node:</label><input type="text" name="node" title="The node name"/></div>');
    var volAddr = $('<div><label>Volume addresses:</label><input type="text" name="volAddr" value="' + tgtVol + '" title="The real device number of the volume to be shared"/></div>');
    var shareEnable = $('<div><label>Share enable:</label><select name="shareEnable" title="Turns sharing of the specified full-pack minidisk on or off"><option value="ON">On</option><option value="OFF">Off</option></select></div>');
    shareDiskForm.append(node, volAddr, shareEnable);

    // Generate tooltips
    shareDiskForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to delete disk
    shareDiskForm.dialog({
        title:'Share disk',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 500,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                // Get inputs
                var node = $(this).find('input[name=node]').val();
                var volAddr = $(this).find('input[name=volAddr]').val();
                var shareEnable = $(this).find('select[name=shareEnable]').val();

                // If inputs are not complete, show warning message
                var ready = true;
                var args = new Array('input[name=node]', 'input[name=volAddr]', 'select[name=shareEnable]');
                for (var i in args) {
                    if (!$(this).find(args[i]).val()) {
                        $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                        ready = false;
                    } else {
                        $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                    }
                }

                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar('Please provide a value for each required field.');
                    warn.prependTo($(this));
                    return;
                }

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                // Remove disk from pool
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'chvm',
                        tgt : node,
                        args : "--sharevolume;" + volAddr + ";" + shareEnable,
                        msg : dialogId
                    },

                    success : updateResourceDialog
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create add SCSI 2 system dialog
 *
 * @param hcp Hardware control point of node
 */
function openAddScsi2SystemDialog(hcp) {
    var dialogId = 'zvmAddScsi2System';

    // Create form to add disk
    var addS2SForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Obtain mapping for zHCP to zVM system
    var hcp2zvm = new Object();
    hcp2zvm = getHcpZvmHash();

    // Create info bar
    var info = createInfoBar('Dynamically add an SCSI disk to a running z/VM system as an EDEV.');
    addS2SForm.append(info);

    var system = $('<div><label>z/VM system:</label></div>');
    var systemSelect = $('<select name="system" title="The z/VM system name"></select>');
    system.append(systemSelect);

    // Append options for hardware control points
    //systemSelect.append($('<option value=""></option>'));
    for (var hcp in hcp2zvm) {
        systemSelect.append($('<option value="' + hcp2zvm[hcp] + '">' + hcp2zvm[hcp] + '</option>'));
    }

    var devNo = $('<div><label>Device number:</label><input type="text" name="devNo" maxlength="4" title="The SCSI disk device number"/></div>');
    var devPathLabel = $('<label>Device paths:</label>');
    var devPathCount = 1;
    //var pathDiv = $('<div class="devPath" style="margin-left:125px;"></div>');

    var devPathDiv = $('<div id="devPathArray"></div>');
    var devPathTable = $('<table style="margin-left:140px;"></table>');
    var devPathHeader = $('<thead class="ui-widget-header"> <th></th><th>FCP Device</th> <th>WWPN</th> <th>LUN</th></thead>');
    // Adjust header width
    devPathHeader.find('th').css({
        'width' : '120px'
    });
    devPathHeader.find('th').eq(0).css({
        'width' : '20px'
    });
    var devPathBody = $('<tbody></tbody>');
    var devPathFooter = $('<tfoot></tfoot>');

    // Create a row
    var devPathRow = $('<tr class="devPath"></tr>');

    // Add blank column (remove button replacement)
    devPathRow.append('<td style="padding: 0px;"></td>');

    // Create FCP device number input
    var fcpDevNum = $('<td><input type="text" style="width: 100px;" name="fcpDevNum" maxlength="4" title="The FCP device number"/></td>');
    devPathRow.append(fcpDevNum);

    // Create FCP WWPN input
    var fcpWwpn = $('<td><input type="text" style="width: 100px;" name="fcpWwpn" maxlength="16" title="The FCP world wide port number"/></td>');
    devPathRow.append(fcpWwpn);

    if ($.cookie('zvms')) {
        zvms = $.cookie('zvms').split(',');
        var zvm;
        for (var i in zvms) {
            if( !zvms[i] || 0 === zvms[i].length) continue;
            var args = zvms[i].split(':');
            var zvm = args[0].toLowerCase();
            var iHcp = args[1];
        }
    }

    // Create FCP LUN input
    var fcpLun = $('<td><input type="text" style="width: 100px;" name="fcpLun" maxlength="16" title="The FCP logical unit number"/></td>');
    devPathRow.append(fcpLun);

    devPathBody.append(devPathRow);

    var addDevPathLink = $('<a>+ Add path</a>');
    addDevPathLink.bind('click', function(event){
        devPathCount = devPathCount + 1;
        // Create a row
        var devPathRow = $('<tr class="devPath"></tr>');

        // Add remove button
        var removeBtn = $('<span class="ui-icon ui-icon-close"></span>').css({
            "float": "left",
            "cursor": "pointer"
        });
        var col = $('<td></td>').append(removeBtn);
        removeBtn.bind('click', function(event) {
            $(this).parent().parent().remove();
        });
        devPathRow.append(col);

        // Create FCP device number input
        var fcpDevNum = $('<td><input type="text" style="width: 100px;" name="fcpDevNum" maxlength="4" title="The FCP device number"/></td>');
        devPathRow.append(fcpDevNum);

        // Create FCP WWPN input
        var fcpWwpn = $('<td><input type="text" style="width: 100px;" name="fcpWwpn" maxlength="16" title="The world wide port number"/></td>');
        devPathRow.append(fcpWwpn);

        // Create FCP LUN input
        var fcpLun = $('<td><input type="text" style="width: 100px;" name="fcpLun" maxlength="16" title="The logical unit number"/></td>');
        devPathRow.append(fcpLun);

        devPathBody.append(devPathRow);

        // Generate tooltips
        addS2SForm.find('div input[title],select[title]').tooltip({
            position: "center right",
            offset: [-2, 10],
            effect: "fade",
            opacity: 0.8,
            delay: 0,
            predelay: 800,
            events: {
                  def:     "mouseover,mouseout",
                  input:   "mouseover,mouseout",
                  widget:  "focus mouseover,blur mouseout",
                  tooltip: "mouseover,mouseout"
            },

            // Change z index to show tooltip in front
            onBeforeShow: function() {
                this.getTip().css('z-index', $.topZIndex());
            }
        });
    });
    devPathFooter.append(addDevPathLink);
    devPathTable.append(devPathHeader);
    devPathTable.append(devPathBody);
    devPathTable.append(devPathFooter);
    devPathDiv.append(devPathLabel);
    devPathDiv.append(devPathTable);

    var option = $('<div><label>Option:</label><select name="option" title="The action to perform">' +
            '<option selected value="1">Add a new SCSI disk</option>' +
            '<option value="2">Add new paths to an existing SCSI disk</option>' +
            '<option value="3">Delete paths from an existing SCSI disk</option>' +
        '</select></div>');
    var persist = $('<div><label>Persist:</label><select name="persist" title="Specifies that the SCSI device is to be updated on the active system configuration or both the active and permanent system configurations">' +
            '<option selected value="NO">No</option>' +
            '<option value="YES">Yes</option>' +
        '</select></div>');
    addS2SForm.append(system, devNo, devPathDiv, option, persist);

    // Generate tooltips
    addS2SForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    addS2SForm.find('div input[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.7,
        predelay: 800,
        events: {
            def:     "mouseover,mouseout",
            input:   "mouseover,mouseout",
            widget:  "focus mouseover,blur mouseout",
            tooltip: "mouseover,mouseout"
        }
    });

    // Open dialog to add disk
    addS2SForm.dialog({
        title:'Add SCSI to running system',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 675,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                var system = $(this).find('select[name=system]').val();
                var devNo = $(this).find('input[name=devNo]').val();
                var pathArray = "";
                jQuery('.devPath').each(function(index) {
                    pathArray += $(this).find('input[name=fcpDevNum]').val() + ',';
                    pathArray += $(this).find('input[name=fcpWwpn]').val() +  ',';
                    pathArray += $(this).find('input[name=fcpLun]').val() +  ';';
                });
                var option = $(this).find('select[name=option]').val();
                var persist = $(this).find('select[name=persist]').val();
                // If inputs are not complete, show warning message
                var ready = true;
                var args = new Array('select[name=system]', 'input[name=fcpDevNum]', 'select[name=option]', 'select[name=persist]');
                for (var i in args) {
                    if (!$(this).find(args[i]).val()) {
                        $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                        ready = false;
                    } else {
                        $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                    }
                }

                // Show warning message
                if (!ready || !pathArray) {
                    var warn = createWarnBar('Please provide a value for each required field.');
                    warn.prependTo($(this));
                    return;
                }

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'chhypervisor',
                        tgt : system,
                        args : "--addscsi||" + devNo + "||" + pathArray + "||" + option + "||" + persist,
                        msg : dialogId
                    },

                    success : updateResourceDialog
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Delete a real SCSI disk
 *
 * @param hcp Hardware control point of node
 */
function openRemoveScsiDialog(hcp) {
    var dialogId = 'zvmRemoveScsiDialog';
    // Create form to add disk
    var removeScsiForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Obtain mapping for zHCP to zVM system
    var hcp2zvm = new Object();
    hcp2zvm = getHcpZvmHash();

    var system = $('<div><label>z/VM system:</label></div>');
    var systemSelect = $('<select name="system" title="The z/VM system name"></select>');
    system.append(systemSelect);

    // Append options for hardware control points
    //systemSelect.append($('<option value=""></option>'));
    for (var hcp in hcp2zvm) {
        systemSelect.append($('<option value="' + hcp2zvm[hcp] + '">' + hcp2zvm[hcp] + '</option>'));
    }

    // Create info bar
    var info = createInfoBar('Delete a real SCSI disk');
    removeScsiForm.append(info, system);
    removeScsiForm.append('<div><label>Device number:</label><input type="text" name="devNum" value="" maxlength="4" title="The SCSI disk device number"/></div>');
    removeScsiForm.append('<div><label>Persist:</label><select name="persist" title="Specifies that the SCSI device is to be updated on the active system configuration or both the active and permanent system configurations">' +
            '<option value="NO">No</option>' +
            '<option value="YES>Yes</option>' +
        '</select></div>');

    // Generate tooltips
    removeScsiForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add disk
    removeScsiForm.dialog({
        title:'Delete a real SCSI disk',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 400,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                // Get inputs
                var system = $(this).find('select[name=system]').val();
                var devnum = $(this).find('input[name=devNum]').val();
                var persist = $(this).find('select[name=persist]').val();

                // If inputs are not complete, show warning message
                var ready = true;
                var args = new Array('select[name=system]', 'input[name=devNum]');
                for (var i in args) {
                    if (!$(this).find(args[i]).val()) {
                        $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                        ready = false;
                    } else {
                        $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                    }
                }

                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar('Please provide a value for each required field.');
                    warn.prependTo($(this));
                    return;
                }

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'chhypervisor',
                        tgt : system,
                        args : "--removescsi;" + devnum + ";" + persist,
                        msg : dialogId
                    },

                    success : updateResourceDialog
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Create add NIC dialog
 *
 * @param node Node to add NIC to
 * @param hcp Hardware control point of node
 */
function openAddNicDialog(node, hcp) {

    // Get the hcp node name for the node
    // Should be in a cookie, else just take first part of hostname
    var hcpNode = $.cookie(node+'_hcpnodename');
    if (!hcpNode) {
        if (typeof console == "object"){
              console.log("openAddNicDialog did not find cookie for <"+node+"_hcpnodename> Using first token in hostname");
        }
        hcpNode = hcp.split('.')[0];
    }
    if (typeof console == "object"){
          console.log("Entering openAddNicDialog for node<"+node+"> zhcp node<"+hcpNode+">");
    }

    // Get network names
    var cookie = $.cookie(hcpNode + 'networks');
    var networks = new Array();
    if (cookie) {
        networks = cookie.split(',');
    }


    // Create form to add NIC
    var addNicForm = $('<div class="form"></div>');
    // Create info bar
    var info = createInfoBar('Add a NIC to this virtual server.');
    var statBarId = node + "statBarIdAddNIC";
    var statBar = createStatusBar(statBarId);
    statBar.append("<img id='loadingvswitchinfo' src='images/loader.gif'>");
    statBar.append("<B>Loading vswitch information</B>");
    var ajaxrequest = 0;

    addNicForm.append(info);
    addNicForm.append(statBar);
    addNicForm.append('<div><label>Node:</label><input type="text" readonly="readonly" id="nicNode" name="nicNode" value="' + node + '" title="The node name"/></div>');
    addNicForm.append('<div><label>NIC address:</label><input type="text" id="nicAddress" name="nicAddress" title="The virtual device address for the new adapter"/></div>');

    // Create drop down for NIC types
    var nicType = $('<div></div>');
    nicType.append('<label>NIC type:</label>');
    var nicTypeSelect = $('<select id="nicType" name="nicType" title="The adapter type"></select>');
    nicTypeSelect.append('<option></option>'
        + '<option>QDIO</option>'
        + '<option>HiperSockets</option>'
    );
    nicType.append(nicTypeSelect);
    addNicForm.append(nicType);

    // Create drop down for network types
    var networkType = $('<div></div>');
    networkType.append('<label>Network type:</label>');
    var networkTypeSelect = $('<select name="nicNetworkType" title="The network type"></select>');
    networkTypeSelect.append('<option></option>'
        + '<option>Guest LAN</option>'
        + '<option>Virtual Switch</option>'
    );
    networkType.append(networkTypeSelect);
    addNicForm.append(networkType);
    var hashtable = getselectedNetworkHash();
    if (!hashtable) {
        hashtable = [[]];
        setselectedNetworkHash(hashtable);

        if (typeof console == "object") {
            console.log("openAddNicDialog. creating new hash[[]] table." );
        }
    }

    // Create drop down for network names
    var gLansQdioSelect = $('<select id="nicLanQdioName" name="nicLanQdioName" title="The name of the guest LAN segment"></select>');
    var gLansHipersSelect = $('<select id="nicLanHipersName" name="nicLanHipersName" title="The name of the guest LAN segment"></select>');
    var vswitchSelect = $('<select id="nicVSwitchName" name="nicVSwitchName" title="The name of the virtual switch segment"></select>');
    for ( var i = 0; i < networks.length; i++) {
        if( !networks[i] || 0 === networks[i].length) continue;
        var network = networks[i].split(' ');
        var networkOption = $('<option>' + network[1] + ' ' + network[2] + '</option>');
        if (network[0] == 'VSWITCH') {
            vswitchSelect.append(networkOption);

            // Load and save specific vswitch details in global table if not there
            network[2] = jQuery.trim(network[2]); // Remove new line x012 from end
            if (typeof hashtable[node + '_NIC_' + network[2]] === 'undefined') {
                if (typeof console == "object"){
                      console.log("Calling getNetworkDetails for switch:<"+network[2]+">");
                }
                ajaxrequest = 1;
                getNetworkDetails(hcpNode, network[2], node + '_NIC_' + network[2], '');
            }
        } else if (network[0] == 'LAN:QDIO') {
            gLansQdioSelect.append(networkOption);
        } else if (network[0] == 'LAN:HIPERS') {
            gLansHipersSelect.append(networkOption);
        }
    }

    // Hide network name drop downs until the NIC type and network type is selected
    // QDIO Guest LAN drop down
    var guestLanQdio = $('<div></div>').hide();
    guestLanQdio.append('<label>Guest LAN name:</label>');
    guestLanQdio.append(gLansQdioSelect);
    addNicForm.append(guestLanQdio);

    // HIPERS Guest LAN drop down
    var guestLanHipers = $('<div></div>').hide();
    guestLanHipers.append('<label>Guest LAN name:</label>');
    guestLanHipers.append(gLansHipersSelect);
    addNicForm.append(guestLanHipers);

    // VSWITCH drop down
    var vswitch = $('<div></div>').hide();
    vswitch.append('<label>VSWITCH name:</label>');
    vswitch.append(vswitchSelect);

    // VLAN id with Porttype
    var vswitchvlan = $('<div id="vlandiv"></div>');
    vswitchvlan.append('<label>Vswitch GRANT details.</label><br><label>Porttype:</label>');
    var vswitchPorttype = $('<select name="vswitchVLANporttype" id="vswitchVLANporttype" title="The VSwitch porttype to be granted.">' +
                            '<option>default</option>' + '<option>ACCESS</option>' + '<option>TRUNK</option>' + '</select>');
    vswitchvlan.append(vswitchPorttype);
    vswitchvlan.append('<br><label>VLAN id:</label>');
    var vswitchVLANId = $('<input name="vswitchvlanid" id="vswitchvlanid" type="text" size="19" maxlength="19" value="default" title="The VLAN id to be granted."/>');
    vswitchvlan.append(vswitchVLANId);

    vswitch.append(vswitchvlan);
    vswitchvlan.hide();
    addNicForm.append(vswitch);

    // Show network names on change
    networkTypeSelect.change(function(){
        // Remove any warning messages
        $(this).parent().parent().find('.ui-state-error').remove();
        var networkType = $(this).val();

        if (typeof console == "object"){
              console.log("Entering networkTypeSelect.change");
        }
        // Get NIC type and network type
        var nicType = $(this).parent().parent().find('select[name=nicType]').val();
        var networkType = $(this).val();

        // Hide network name drop downs
        var guestLanQdio = $(this).parent().parent().find('select[name=nicLanQdioName]').parent();
        var guestLanHipers = $(this).parent().parent().find('select[name=nicLanHipersName]').parent();
        var vswitch = $(this).parent().parent().find('select[name=nicVSwitchName]').parent();
        var mynode = $(this).parent().parent().find('input[name=nicNode]').val();
        var showvlan = $(this).parent().parent().find('select[name=vswitchVLANporttype]').parent();
        var hashtable = getselectedNetworkHash();
        guestLanQdio.hide();
        guestLanHipers.hide();
        vswitch.hide();

        // Show correct network name
        if (networkType == 'Guest LAN' && nicType == 'QDIO') {
            guestLanQdio.show();
        } else if (networkType == 'Guest LAN' && nicType == 'HiperSockets') {
            guestLanHipers.show();
        } else if (networkType == 'Virtual Switch') {
            if (nicType == 'QDIO') {
                vswitch.show();
                // Show vlan information only if vlan aware
                var switchname = $(this).parent().parent().find('select[name=nicVSwitchName]').val();
                var tokens = switchname.split(' ');
                var switchkeyid = mynode + '_NIC_' + jQuery.trim(tokens[1]);
                if (typeof console == "object"){
                      console.log("Checking vswitch index:"+switchkeyid);
                }

                // Is this a vlanaware switch, if so show the special fields
                if (hashtable[switchkeyid]["vlan_awareness"] == "AWARE") {
                    showvlan.find('input[name=vswitchvlanid]').val(hashtable[switchkeyid]["vlan_id"]);
                    showvlan.find('select[name=vswitchVLANporttype]').val(hashtable[switchkeyid]["port_type"]);
                    showvlan.show();
                } else {
                    showvlan.hide();
                    showvlan.find('input[name=vswitchvlanid]').val('default');
                    showvlan.find('select[name=vswitchVLANporttype]').val('default');
                }
            } else {
                // No such thing as HIPERS VSWITCH
                var warn = createWarnBar('The selected choices are not valid.');
                warn.prependTo($(this).parent().parent());
            }
        }
    });

    //
    // Show network names on change
    //
    nicTypeSelect.change(function(){
        // Remove any warning messages
        $(this).parent().parent().find('.ui-state-error').remove();

        if (typeof console == "object"){
              console.log("Entering nicTypeSelect.change");
        }

        // Get NIC type and network type
        var nicType = $(this).val();
        var networkType = $(this).parent().parent().find('select[name=nicNetworkType]').val();
        var mynode = $(this).parent().parent().find('input[name=nicNode]').val();

        // Hide network name drop downs
        var guestLanQdio = $(this).parent().parent().find('select[name=nicLanQdioName]').parent();
        var guestLanHipers = $(this).parent().parent().find('select[name=nicLanHipersName]').parent();
        var vswitch = $(this).parent().parent().find('select[name=nicVSwitchName]').parent();
        var showvlan = $(this).parent().parent().find('select[name=vswitchVLANporttype]').parent();
        var hashtable = getselectedNetworkHash();
        guestLanQdio.hide();
        guestLanHipers.hide();
        vswitch.hide();

        // Show correct network name
        if (networkType == 'Guest LAN' && nicType == 'QDIO') {
            guestLanQdio.show();
        } else if (networkType == 'Guest LAN' && nicType == 'HiperSockets') {
            guestLanHipers.show();
        } else if (networkType == 'Virtual Switch') {
            if (nicType == 'QDIO') {
                vswitch.show();
                var switchname = $(this).parent().parent().find('select[name=nicVSwitchName]').val();
                var tokens = switchname.split(' ');
                var switchkeyid = mynode + '_NIC_' + jQuery.trim(tokens[1]);

                if (typeof console == "object"){
                      console.log("Entering nictypeselect.change. switchkey:<"+switchkeyid);
                }

                // Is this a vlanaware switch, if so show the special fields
                if (hashtable[switchkeyid]["vlan_awareness"] == "AWARE") {
                    showvlan.find('input[name=vswitchvlanid]').val(hashtable[switchkeyid]["vlan_id"]);
                    showvlan.find('select[name=vswitchVLANporttype]').val(hashtable[switchkeyid]["port_type"]);
                    showvlan.show();
                } else {
                    showvlan.hide();
                    showvlan.find('input[name=vswitchvlanid]').val('default');
                    showvlan.find('select[name=vswitchVLANporttype]').val('default');
                }

            } else {
                // No such thing as HIPERS VSWITCH
                var warn = createWarnBar('The selected choices are not valid.');
                warn.prependTo($(this).parent().parent());
            }
        }
    });

    //
    //  Determine if vlanid fields need to be shown based on vswitch
    //
    vswitchSelect.change(function(){
        // Remove any warning messages
        $(this).parent().parent().find('.ui-state-error').remove();

        // Get vlan id division
        var showvlan = $(this).parent().parent().find('select[name=vswitchVLANporttype]').parent();

        // Get selected switch name and break it into tokens
        var switchname = $(this).val();
        var tokens = switchname.split(' ');

        // Get the node we are doing this for and index for hash table
        var mynode = $(this).parent().parent().find('input[name=nicNode]').val();

        var tokens = switchname.split(' ');
        var switchkeyid = mynode + '_NIC_' + jQuery.trim(tokens[1]);
        var hashtable = getselectedNetworkHash();

        if (typeof console == "object"){
              console.log("Entering vswitchselect.change. switchkey:<"+switchkeyid+">");
        }
        // Is this a vlanaware switch, if so show the special fields
        if (hashtable[switchkeyid]["vlan_awareness"] == "AWARE") {
            $(this).find('').val(hashtable[switchkeyid]["vlan_id"]);
            showvlan.find('input[name=vswitchvlanid]').val(hashtable[switchkeyid]["vlan_id"]);
            showvlan.find('select[name=vswitchVLANporttype]').val(hashtable[switchkeyid]["port_type"]);
            showvlan.show();
        } else {
            showvlan.hide();
            showvlan.find('input[name=vswitchvlanid]').val('default');
            showvlan.find('select[name=vswitchVLANporttype]').val('default');
        }
    });


    // Generate tooltips
    addNicForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });


    // Open dialog to add NIC
    addNicForm.dialog({
        title:'Add NIC',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 400,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                var ready = true;
                var errMsg = '';

                // Get inputs
                var node = $(this).find('input[name=nicNode]').val();
                var nicType = $(this).find('select[name=nicType]').val();
                var networkType = $(this).find('select[name=nicNetworkType]').val();
                var address = $(this).find('input[name=nicAddress]').val();

                // If inputs are not complete, show warning message
                if (!node || !nicType || !networkType || !address) {
                    errMsg = 'Please provide a value for each missing field.<br>';
                    ready = false;
                }

                // If a HIPERS VSWITCH is selected, show warning message
                if (nicType == 'HiperSockets' && networkType == 'Virtual Switch') {
                    errMsg += 'The selected choices are not valid.';
                    ready = false;
                }

                // If there are errors
                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar(errMsg);
                    warn.prependTo($(this));
                } else {
                    // Add guest LAN
                    if (networkType == 'Guest LAN') {
                        var temp;
                        if (nicType == 'QDIO') {
                            temp = $(this).find('select[name=nicLanQdioName]').val().split(' ');
                        } else {
                            temp = $(this).find('select[name=nicLanHipersName]').val().split(' ');
                        }

                        var lanOwner = temp[0];
                        var lanName = temp[1];

                        $.ajax( {
                            url : 'lib/cmd.php',
                            dataType : 'json',
                            data : {
                                cmd : 'chvm',
                                tgt : node,
                                args : '--addnic;' + address + ';' + nicType + ';3',
                                msg : 'node=' + node + ';addr=' + address + ';lan='
                                    + lanName + ';owner=' + lanOwner
                            },
                            success : connect2GuestLan
                        });
                    }

                    // Add virtual switch
                    else if (networkType == 'Virtual Switch' && nicType == 'QDIO') {
                        var temp = $(this).find('select[name=nicVSwitchName]').val().split(' ');
                        var vswitchName = jQuery.trim(temp[1]);
                        var switchkeyid = node + '_NIC_' + vswitchName;
                        var hashtable = getselectedNetworkHash();
                        var awareornot = hashtable[switchkeyid]["vlan_awareness"];
                        var porttype = $(this).find('select[name=vswitchVLANporttype]').val();
                        var lanid = $(this).find('input[name=vswitchvlanid]').val();

                        // Pass additional lanid data in msg for grant use by connect2VSwitch
                        $.ajax( {
                            url : 'lib/cmd.php',
                            dataType : 'json',
                            data : {
                                cmd : 'chvm',
                                tgt : node,
                                args : '--addnic;' + address + ';' + nicType + ';3',
                                msg : 'node=' + node + ';addr=' + address + ';vsw='
                                    + vswitchName + ';vlanaware=' + awareornot + ';porttype='
                                    + porttype + ';lanid=' + lanid
                            },

                            success : connect2VSwitch
                        });
                    }

                    // Increment node process
                    incrementNodeProcess(node);

                    // Show loader
                    $('#' + node + 'StatusBarLoader').show();
                    $('#' + node + 'StatusBar').show();

                    // Close dialog
                    $(this).dialog( "close" );
                } // End of else
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
    // Make sure ajax is done before putting up dialog
    $(document).ajaxStop(function() {
        //Remove loading vswitch gif status bar
        statBar.hide();
    });
    if (ajaxrequest == 0) {
        //Remove loading vswitch gif status bar
        statBar.hide();
    }

}

/**
 * Create add vSwitch/VLAN dialog
 *
 * @param hcp Hardware control point of node
 */
function openAddVswitchVlanDialog(hcp) {
    var dialogId = 'zvmAddVswitchVlan';

    // Create form to add disk
    var addVswitchForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Create info bar
    var info = createInfoBar('Create a virtual switch or virtual network LAN.');

    var netFS = $('<fieldset></fieldset>');
    var netLegend = $('<legend>Network</legend>');
    netFS.append(netLegend);

    var typeFS = $('<fieldset></fieldset>').hide();
    var typeLegend = $('<legend>Network</legend>');
    typeFS.append(typeLegend);
    addVswitchForm.append(info, netFS, typeFS);

    var netAttr = $('<div style="display: inline-table; vertical-align: middle;"></div>');
    netFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/network.png"></img></div>'));
    netFS.append(netAttr);

    var networkTypeDiv = $('<div><label>Network Type:</label>');
    var networkType = $('<select name="networkType">' +
            '<option></option>' +
            '<option value="vswitch">vSwitch</option>' +
            '<option value="vlan">VLAN</option>' +
        '</select></div>');
    networkTypeDiv.append(networkType)
    netAttr.append(networkTypeDiv);

    var system = $('<div><label>z/VM system:</label></div>');
    var systemSelect = $('<select name="system" title="The z/VM system name"></select>');
    system.append(systemSelect);
    netAttr.append(system);

    // Obtain mapping for zHCP to zVM system
    var hcp2zvm = new Object();
    hcp2zvm = getHcpZvmHash();
    //systemSelect.append($('<option value=""></option>'));
    for (var hcp in hcp2zvm) {
        systemSelect.append($('<option value="' + hcp2zvm[hcp] + '">' + hcp2zvm[hcp] + '</option>'));
    }

    var typeAttr = $('<div style="display: inline-table; vertical-align: middle;"></div>');
    typeFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/preferences_network.png"></img></div>'));
    typeFS.append(typeAttr);

    // Create vSwitch parameters
    var vswitchOptions = $('<div name=vswitchOptions></div>').hide();
    vswitchOptions.append($('<div><label>Switch name:</label><input type="text" name="switchName" title="The name of the virtual switch segment"/></div>'));
    vswitchOptions.append($('<div><label>Device address:</label><input type="text" name="deviceAddress" title="The real device address of a real OSA-Express QDIO device used to create the switch to the virtual adapter"/></div>'));
    vswitchOptions.append($('<div><label>Controller name:</label><input type="text" name="controllerName" title="The userid controlling the real device"/></div>'));

    // Create an advanced link to configure optional network settings
    var advancedLnk = $('<div><label><a style="color: blue; cursor: pointer;">Advanced</a></label></div>');
    vswitchOptions.append(advancedLnk);
    var advanced = $('<div style="margin-left: 20px;"></div>').hide();
    vswitchOptions.append(advanced);

    // Show IP address and hostname inputs on-click
    advancedLnk.click(function() {
        advanced.toggle();
    });

    advanced.append($('<div><label>Connection:</label><select name="connection" title="The real device connection">' +
            '<option value="0">Unspecified</option>' +
            '<option value="1">Activate real device connection</option>' +
            '<option value="2">Do not activate real device connection</option>' +
        '</select></div>'));
    advanced.append($('<div><label>QDIO buffer size:</label><input type="text" name="queueMemoryLimit" maxlength="1" value="8" title="A number between 1 and 8 specifying the QDIO buffer size in megabytes. If unspecified, the default is 8."/></div>'));
    advanced.append($('<div><label>Routing:</label><select name="routingValue" title="Specifies whether the OSA-Express QDIO device will act as a router to the virtual switch">' +
            '<option value="0">Unspecified</option>' +
            '<option value="1">NONROUTER</option>' +
            '<option value="2">PRIROUTER</option>' +
        '</select></div>'));
    advanced.append($('<div><label>Transport:</label><select name="transportType" title="Specifies the transport mechanism to be used for the virtual switch">' +
            '<option value="0">Unspecified</option>' +
            '<option value="1">IP</option>' +
            '<option value="2">ETHERNET</option>' +
        '</select></div>'));
    advanced.append($('<div><label>VLAN ID:</label><input type="text" name="vlanId" value="-1" title="Specifies the VLAN ID"/></div>'));
    advanced.append($('<div><label>Port type:</label><select name="portType" title="Specifies the port type">' +
            '<option value="0">Unspecified</option>' +
            '<option value="1">ACCESS</option>' +
            '<option value="2">TRUNK</option>' +
        '</select></div>'));
    advanced.append($('<div><label>Update sysconfig:</label><select name="updateSysConfig" title="Specifies whether to add the virtual switch definition to the system configuration file">' +
            '<option value="0">Unspecified</option>' +
            '<option value="1">Create virtual switch</option>' +
            '<option value="2">Create virtual switch and add definition to system configuration</option>' +
            '<option value="3">Add virtual switch definition to system configuration</option>' +
        '</select></div>'));
    advanced.append($('<div><label>GVRP:</label><select name="gvrp" title="GVRP will run only on 802.1Q trunk ports and is used primarily to prune traffic from VLANs that does not need to be passed between trunking switches">' +
            '<option value="0">Unspecified</option>' +
            '<option value="1">GVRP</option>' +
            '<option value="2">NOGVRP</option>' +
        '</select></div>'));
    advanced.append($('<div><label>Native VLAN ID:</label><input type="text" name="nativeVlanId" value="-1" title="The native VLAN ID"/></div>'));

    // Create VLAN parameters
    var vlanOptions = $('<div name=vlanOptions></div>').hide();
    vlanOptions.append($('<div><label>Name:</label><input type="text" name="vlanName" title="The name of the guest LAN segment to be created"/></div>'));
    vlanOptions.append($('<div><label>Owner:</label><input type="text" name="vlanOwner" title="The virtual image owning the guest LAN segment to be created"/></div>'));
    vlanOptions.append($('<div><label>Type:</label><select name="vlanType" title="The type of guest LAN segment">' +
            '<option value=""></option>' +
            '<option value="1">Unrestricted HiperSockets NIC</option>' +
            '<option value="2">Unrestricted QDIO NIC</option>' +
            '<option value="3">Restricted HiperSockets NIC</option>' +
            '<option value="4">Restricted QDIO NIC</option>' +
        '</select></div>'));
    vlanOptions.append($('<div><label>Transport:</label><select name="vlanTransport" title="The transport mechanism to be used for guest LANs and virtual switches">' +
            '<option value=""></option>' +
            '<option value="0">Unspecified</option>' +
            '<option value="1">IP</option>' +
            '<option value="2">Ethernet</option>' +
        '</select></div>'));

    typeAttr.append(vswitchOptions, vlanOptions);

    networkType.change(function() {
        typeFS.show();
        if ($(this).val() == "vswitch") {
            typeFS.find("legend").text("vSwitch");
            vswitchOptions.show();
            vlanOptions.hide();
        } else if ($(this).val() == "vlan") {
            typeFS.find("legend").text("VLAN");
            vswitchOptions.hide();
            vlanOptions.show();
        } else {
            typeFS.find("legend").text("");
            vswitchOptions.hide();
            vlanOptions.hide();
            typeFS.hide();
        }
    });

    // Generate tooltips
    addVswitchForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add vSwitch or VLAN
    addVswitchForm.dialog({
        title:'Add vSwitch or VLAN',
        modal: true,
        close: function() {
            $(this).remove();
        },
        width: 750,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                var networkType = $(this).find('select[name=networkType]').val();
                if (networkType == "vswitch") {
                    var networkArgs = "--addvswitch;";
                    var system = $(this).find('select[name=system]').val();
                    var switchName = $(this).find('input[name=switchName]').val();
                    var deviceAddress = $(this).find('input[name=deviceAddress]').val();
                    var portName = switchName;
                    var controllerName = $(this).find('input[name=controllerName]').val();
                    var connection = $(this).find('select[name=connection]').val();
                    var queueMemoryLimit = $(this).find('input[name=queueMemoryLimit]').val();
                    var routingValue = $(this).find('select[name=routingValue]').val();
                    var transportType = $(this).find('select[name=transportType]').val();
                    var vlanId = $(this).find('input[name=vlanId]').val();
                    var portType = $(this).find('select[name=vswitchVLANporttype]').val();
                    var updateSysConfig = $(this).find('select[name=updateSysConfig]').val();
                    var gvrp = $(this).find('select[name=gvrp]').val();
                    var nativeVlanId = $(this).find('input[name=nativeVlanId]').val();

                    // If inputs are not complete, show warning message
                    var ready = true;
                    var args = new Array('select[name=system]', 'input[name=switchName]', 'input[name=deviceAddress]', 'input[name=controllerName]');
                    for (var i in args) {
                        if (!$(this).find(args[i]).val()) {
                            $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                            ready = false;
                        } else {
                            $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                        }
                    }

                    // Show warning message
                    if (!ready) {
                        var warn = createWarnBar('Please provide a value for each required field.');
                        warn.prependTo($(this));
                        return;
                    }

                    if (switchName)
                        networkArgs += switchName + ";";
                    if (deviceAddress)
                        networkArgs += deviceAddress + ";";
                    if (portName)
                        networkArgs += portName + ";";
                    if (controllerName)
                        networkArgs += controllerName + ";";

                    // Optional parameters
                    if (connection)
                        networkArgs += connection + ";";
                    if (queueMemoryLimit)
                        networkArgs += queueMemoryLimit + ";";
                    if (routingValue)
                        networkArgs += routingValue + ";";
                    if (transportType)
                        networkArgs += transportType + ";";
                    if (vlanId)
                        networkArgs += vlanId + ";";
                    if (portType)
                        networkArgs += portType + ";";
                    if (updateSysConfig)
                        networkArgs += updateSysConfig + ";";
                    if (gvrp)
                        networkArgs += gvrp + ";";
                    if (nativeVlanId)
                        networkArgs += nativeVlanId + ";";
                    networkArgs = networkArgs.substring(0, networkArgs.length - 1);

                    // Change dialog buttons
                    $(this).dialog('option', 'buttons', {
                        'Close': function() {$(this).dialog("close");}
                    });

                    $.ajax({
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chhypervisor',
                            tgt : system,
                            args : networkArgs,
                            msg : dialogId
                        },

                        success : updateResourceDialog
                    });
                } else if (networkType == "vlan") {
                    var networkArgs = "--addvlan;";
                    var system = $(this).find('select[name=system]').val();
                    var vlanName = $(this).find('input[name=vlanName]').val();
                    var vlanOwner = $(this).find('input[name=vlanOwner]').val();
                    var vlanType = $(this).find('select[name=vlanType]').val();
                    var vlanTransport = $(this).find('select[name=vlanTransport]').val();

                    // If inputs are not complete, show warning message
                    var ready = true;
                    var args = new Array('select[name=system]', 'input[name=vlanName]', 'input[name=vlanOwner]', 'select[name=vlanType]', 'select[name=vlanTransport]');
                    for (var i in args) {
                        if (!$(this).find(args[i]).val()) {
                            $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                            ready = false;
                        } else {
                            $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                        }
                    }

                    // Show warning message
                    if (!ready) {
                        var warn = createWarnBar('Please provide a value for each required field.');
                        warn.prependTo($(this));
                        return;
                    }

                    // Ethernet Hipersockets are not supported
                    if (vlanTransport == "2") {
                        var warn = createWarnBar('Ethernet Hipersockets are not supported');
                        warn.prependTo($(this));
                        return;
                    }

                    networkArgs += vlanName + ";";
                    networkArgs += vlanOwner + ";";
                    networkArgs += vlanType + ";";
                    networkArgs += vlanTransport;

                    // Change dialog buttons
                    $(this).dialog('option', 'buttons', {
                        'Close': function() {$(this).dialog("close");}
                    });
                    $.ajax({
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'chhypervisor',
                            tgt : system,
                            args : networkArgs,
                            msg : dialogId
                        },

                        success : updateResourceDialog
                    });
                }  // End of else if
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to delete network
 *
 * @param node type name for removing network
 */
function openRemoveVswitchVlanDialog(networkList) {
    var names = '';
    for (var i in networkList) {
        var networkArgs = networkList[i].split(';');
        networkArgs[2] = jQuery.trim(networkArgs[2]);
        names += networkArgs[2] + ', ';
    }
    names = names.substring(0, names.length - 2);  // Delete last two characters

    var confirmDialog = $('<div><p>Are you sure you want to remove ' + names + '?</p></div>');
    confirmDialog.dialog({
        title: "Confirm",
        modal: true,
        width: 400,
        buttons: {
            "Ok": function() {
                for (var i in networkList) {
                    var networkArgs = networkList[i].split(';');
                    var node = networkArgs[0];
                    var type = networkArgs[1];
                    var name = jQuery.trim(networkArgs[2]);
                    var owner = networkArgs[3];

                    if (type.indexOf("VSWITCH") != -1) {
                        $.ajax({
                            url : 'lib/cmd.php',
                            dataType : 'json',
                            data : {
                                cmd : 'chhypervisor',
                                tgt : node,
                                args : '--removevswitch;' + name,
                                msg : ''
                            },

                            success: function(data) {
                                var infoMsg;

                                // Create info message
                                if (jQuery.isArray(data.rsp)) {
                                    infoMsg = '';
                                    for (var i in data.rsp) {
                                        infoMsg += data.rsp[i] + '</br>';
                                    }
                                } else {
                                    infoMsg = data.rsp;
                                }

                                openDialog("info", infoMsg);
                            }
                        });
                    } else if (type.indexOf("LAN") != -1) {
                        $.ajax({
                            url : 'lib/cmd.php',
                            dataType : 'json',
                            data : {
                                cmd : 'chhypervisor',
                                tgt : node,
                                args : '--removevlan;' + name + ';' + owner,
                                msg : ''
                            },

                            success: function(data) {
                                var infoMsg;

                                // Create info message
                                if (jQuery.isArray(data.rsp)) {
                                    infoMsg = '';
                                    for (var i in data.rsp) {
                                        infoMsg += data.rsp[i] + '</br>';
                                    }
                                } else {
                                    infoMsg = data.rsp;
                                }

                                openDialog("info", infoMsg);
                            }
                        });
                    }
                }
                $(this).dialog("close");
            },
            "Cancel": function() {
                $(this).dialog("close");
            }
        }
    });
}

/**
 * Remove processor
 *
 * @param node Node where processor is attached
 * @param address Virtual address of processor
 */
function removeProcessor(node, address) {
    $.ajax( {
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'chvm',
            tgt : node,
            args : '--removeprocessor;' + address,
            msg : node
        },

        success : updateZNodeStatus
    });

    // Increment node process
    incrementNodeProcess(node);

    // Show loader
    $('#' + node + 'StatusBarLoader').show();
    $('#' + node + 'StatusBar').show();
}

/**
 * Remove disk
 *
 * @param node Node where disk is attached
 * @param address Virtual address of disk
 */
function removeDisk(node, address) {
    $.ajax( {
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'chvm',
            tgt : node,
            args : '--removedisk;' + address,
            msg : node
        },

        success : updateZNodeStatus
    });

    // Increment node process
    incrementNodeProcess(node);

    // Show loader
    $('#' + node + 'StatusBarLoader').show();
    $('#' + node + 'StatusBar').show();
}

/**
 * Remove zFCP device
 *
 * @param node Node where disk is attached
 * @param address Virtual address of zFCP device
 * @param wwpn World wide port name of zFCP device
 * @param lun Logical unit number of zFCP device
 */
function removeZfcp(node, address, wwpn, lun) {
    $.ajax( {
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'chvm',
            tgt : node,
            args : '--removezfcp||' + address + '||' + wwpn + '||' + lun,
            msg : node
        },

        success : updateZNodeStatus
    });

    // Increment node process
    incrementNodeProcess(node);

    // Show loader
    $('#' + node + 'StatusBarLoader').show();
    $('#' + node + 'StatusBar').show();
}

/**
 * Remove NIC
 *
 * @param node Node where NIC is attached
 * @param address Virtual address of NIC
 */
function removeNic(node, nic) {
    var args = nic.split('.');
    var address = args[0];

    $.ajax( {
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'chvm',
            tgt : node,
            args : '--removenic;' + address,
            msg : node
        },

        success : updateZNodeStatus
    });

    // Increment node process
    incrementNodeProcess(node);

    // Show loader
    $('#' + node + 'StatusBarLoader').show();
    $('#' + node + 'StatusBar').show();
}

/**
 * Set a cookie for the network names of a given node
 *
 * @param data Data from HTTP request
 */
function setNetworkCookies(data) {
    if (data.rsp.length  && data.rsp[0].indexOf("Failed") == -1) {
        var node = data.msg;
        var networks = data.rsp[0].split(node + ': ');

        // Set cookie to expire in 60 minutes
        var exDate = new Date();
        exDate.setTime(exDate.getTime() + (60 * 60 * 1000));
        $.cookie(node + 'networks', networks, { expires: exDate });
    }
}

/**
 * Get contents of each disk pool
 *
 * @param data HTTP request data
 */
function getDiskPool(data) {
    if (data.rsp.length && data.rsp[0].indexOf("Failed") == -1 && data.rsp[0].indexOf("Invalid") == -1) {
        var hcp = data.msg;
        var pools = data.rsp[0].split(hcp + ': ');

        // Get contents of each disk pool
        for (var i in pools) {
            if (pools[i]) {
                pools[i] = jQuery.trim(pools[i]);

                // Get used space
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--diskpool;' + pools[i] + ';used',
                        msg : 'hcp=' + hcp + ';pool=' + pools[i] + ';stat=used'
                    },

                    success : loadDiskPoolTable
                });

                // Get free space
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--diskpool;' + pools[i] + ';free',
                        msg : 'hcp=' + hcp + ';pool=' + pools[i] + ';stat=free'
                    },

                    success : loadDiskPoolTable
                });
            } // End of if
        } // End of for
    } else {
        // Display any errors in info bar
        if (data.rsp.length) {
            var panelId = 'zvmDiskResource';
            var info = $('#' + panelId).find('.ui-state-highlight');
            // If there is no info bar, create info bar
            if (!info.length) {
                info = createInfoBar("Error: "+data.rsp[0]);
                $('#' + panelId).append(info);
            } else {
                info.append("<br>Error: "+data.rsp[0]);
            }
        }
        // Load empty table
        loadDiskPoolTable(""); // Must pass something
    }
}

/**
 * Get contents of each zFCP pool
 *
 * @param data HTTP request data
 */
function getZfcpPool(data) {
    if (typeof console == "object"){
        console.log("Entering getZfcpPool.");
    }
    if (data.rsp.length && data.rsp[0].indexOf("Failed") == -1 && data.rsp[0].indexOf("Invalid") == -1) {
        var hcp = data.msg;
        var pools = data.rsp[0].split(hcp + ': ');
        // Get contents of each disk pool
        for (var i in pools) {
            pools[i] = jQuery.trim(pools[i]);
            if (pools[i]) {

                // Query used and free space
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcp,
                        args : '--zfcppool;' + pools[i] + ';all',
                        msg : 'hcp=' + hcp + ';pool=' + pools[i]
                    },
                    success : loadZfcpPoolTable
                });
            } // End of if
        } // End of for
    } else {
        // Display any errors in info bar
        if (data.rsp.length) {
            var panelId = 'zfcpResource';
            var info = $('#' + panelId).find('.ui-state-highlight');
            // If there is no info bar, create info bar
            if (!info.length) {
                info = createInfoBar("Error: "+data.rsp[0]);
                $('#' + panelId).append(info);
            } else {
                info.append("<br>Error: "+data.rsp[0]);
            }
        }
        // Load empty table
        loadZfcpPoolTable(""); // Must pass something
    }
}

/**
 * Get details of each network
 *
 * @param data HTTP request data
 */
function getNetwork(data) {
    if (data.rsp.length && data.rsp[0].indexOf("Failed") == -1 && data.rsp[0].indexOf("Invalid") == -1) {
        var hcp = data.msg;
        var networks = data.rsp[0].split(hcp + ': ');
        if (typeof console == "object"){
            console.log("Entering getNetwork data:<"+networks+">");
        }

        // Loop through each network
        for ( var i = 1; i < networks.length; i++) {
            if( !networks[i] || 0 === networks[i].length) continue;
            var args = networks[i].split(' ');
            var type = args[0];
            var name = args[2];
            name = name.replace(/\n/g,'');

            // Get network details
            $.ajax( {
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'lsvm',
                    tgt : hcp,
                    args : '--getnetwork;' + name + ';' + type,
                    msg : 'hcp=' + hcp + ';type=' + type + ';network=' + name
                },

                success : loadNetworkTable
            });
        } // End of for
    } // End of if
    else {
        if (data.rsp.length) {
            var panelId = 'zvmNetworkResource';
            var info = $('#' + panelId).find('.ui-state-highlight');
            // If there is no info bar, create info bar
            if (!info.length) {
                info = createInfoBar("Error: "+data.rsp[0]);
                $('#' + panelId).append(info);
            } else {
                info.append("<br>Error: "+data.rsp[0]);
            }
        }
        // Normally load empty table, but not for networks
    }
}

/**
 * Load disk pool contents into a table
 *
 * @param data HTTP request data
 */
function loadDiskPoolTable(data) {
    // Remove loader if all hcps queried
    var panelId = 'zvmDiskResource';
    if (!zhcpQueryCountForDisks) {
      $('#' + panelId).find('img[src="images/loader.gif"]').remove();
    }

    var hcp2zvm = new Object();
    var args, hcp, pool, stat, tmp;
    if (data && typeof data.rsp != "undefined") {
        // Do not continue if the call failed
        if (!data.rsp.length && data.rsp[0].indexOf("Failed") > 0) {
            return;
        }

        // Obtain mapping for zHCP to zVM system
        hcp2zvm = getHcpZvmHash();

        args = data.msg.split(';');
        hcp = args[0].replace('hcp=', '');
        pool = args[1].replace('pool=', '');
        stat = jQuery.trim(args[2].replace('stat=', ''));
        tmp = data.rsp[0].split(hcp + ': ');
    } else {
        // Provide empty values so the table will be generated
        hcp = '';
        pool = '';
        stat = '';
        tmp = new Array();
    }

    // Resource tab ID
    var info = $('#' + panelId).find('.ui-state-highlight');
    // If there is no info bar
    if (!info.length) {
        // Create info bar
        info = createInfoBar('Below are disks that are defined in the EXTENT CONTROL file.');
        $('#' + panelId).append(info);
    }

    // Get datatable
    var tableId = 'zDiskDataTable';
    var dTable = getDiskDataTable();
    if (!dTable) {
        // Create a datatable
        var table = new DataTable(tableId);
        // Resource headers: volume ID, device type, start address, and size
        table.init( [ '<input type="checkbox" onclick="selectAllDisk(event, $(this))">', 'z/VM', 'Pool', 'Status', 'Volume', 'Device type', 'Starting address', 'Size' ]);

        // Append datatable to panel
        $('#' + panelId).append(table.object());

        // Turn into datatable
        dTable = $('#' + tableId).dataTable({
            'iDisplayLength': 50,
            "bScrollCollapse": true,
            "sScrollY": "400px",
            "sScrollX": "110%",
            "bAutoWidth": true,
            "oLanguage": {
                "oPaginate": {
                  "sNext": "",
                  "sPrevious": ""
                }
            }
        });
        setDiskDataTable(dTable);
    }

    // Skip index 0 and 1 because it contains nothing
    for (var i = 2; i < tmp.length; i++) {
        tmp[i] = jQuery.trim(tmp[i]);
        var diskAttrs = tmp[i].split(' ');
        var key = hcp2zvm[hcp] + "-" + pool + "-" + diskAttrs[0];
        var type = diskAttrs[1];

        // Calculate disk size
        var size;
        if (type.indexOf('3390') != -1) {
            size = convertCylinders2Gb(parseInt(diskAttrs[3]));
        } else if (type.indexOf('9336') != -1) {
            size = convertBlocks2Gb(parseInt(diskAttrs[3]))
        } else {
            size = 0;
        }
        dTable.fnAddData( [ '<input type="checkbox" name="' + key + '"/>', hcp2zvm[hcp], pool, stat, diskAttrs[0], type, diskAttrs[2], diskAttrs[3] + " (" + size + "G)" ]);
    }

    // Create actions menu
    if (!$('#zvmDiskResourceActions').length) {
        // Empty filter area
        $('#' + tableId + '_length').empty();

        // Add disk to pool
        var addLnk = $('<a>Add</a>');
        addLnk.bind('click', function(event){
            openAddDisk2PoolDialog();
        });

        // Delete disk from pool
        var removeLnk = $('<a>Remove</a>');
        removeLnk.bind('click', function(event){
            var disks = getNodesChecked(tableId);
            openRemoveDiskFromPoolDialog(disks);
        });

        // Refresh table
        var refreshLnk = $('<a>Refresh</a>');
        refreshLnk.bind('click', function(event){
            $('#zvmDiskResource').empty().append(createLoader(''));
            setDiskDataTable('');

            // Create a array for hardware control points
            var hcps = new Array();
            if ($.cookie('hcp').indexOf(',') > -1)
                hcps = $.cookie('hcp').split(',');
            else
                hcps.push($.cookie('hcp'));

            zhcpQueryCountForDisks = hcps.length;
            // Query the disk pools for each
            for (var i in hcps) {
                if( !hcps[i] || 0 === hcps[i].length) continue;
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcps[i],
                        args : '--diskpoolnames',
                        msg : hcps[i]
                    },

                    success : getDiskPool
                });
                zhcpQueryCountForDisks--;
            }
        });

        // Add ECKD to system
        var addEckdLnk = $('<a>Add ECKD</a>');
        addEckdLnk.bind('click', function(event){
            openAddEckd2SystemDialog(hcp);
        });

        // Add Page or Spool
        var addPageSpoolLnk = $('<a>Add page/spool</a>')
        addPageSpoolLnk.bind('click', function(event){
            openAddPageSpoolDialog(hcp);
        });

        // Add EDEV to system
        var addEdevLnk = $('<a>Add EDEV</a>');
        addEdevLnk.bind('click', function(event){
            openAddScsi2SystemDialog(hcp);
        });

        // Remove EDEV
        var removeEdevLnk = $('<a>Remove EDEV</a>');
        removeEdevLnk.bind('click', function(event){
            openRemoveScsiDialog(hcp);
        });

        // Indicate disk is to be shared with various users
        var shareLnk = $('<a>Share disk</a>');
        shareLnk.bind('click', function(event){
            var disks = getNodesChecked(tableId);
            openShareDiskDialog(disks);
        });

        // Add Volume to system
        var addVolumeLnk = $('<a>Add volume to system</a>');
        addVolumeLnk.bind('click', function(event){
            openAddVolume2SystemDialog(hcp);
        });

        // Remove Volume from system
        var removeVolumeLnk = $('<a>Remove volume from system</a>');
        removeVolumeLnk.bind('click', function(event){
            openRemoveVolumeFromSystemDialog(hcp);
        });

        // Advanced menu
        var advancedLnk = '<a>Advanced</a>';
        var advancedMenu = createMenu([addEckdLnk, addPageSpoolLnk, addEdevLnk, removeEdevLnk, addVolumeLnk, removeVolumeLnk, shareLnk]);

        // Create action bar
        var actionBar = $('<div id="zvmDiskResourceActions" class="actionBar"></div>').css("width", "450px");

        // Create an action menu
        var actionsMenu = createMenu([refreshLnk, addLnk, removeLnk, [advancedLnk, advancedMenu]]);
        actionsMenu.superfish();
        actionsMenu.css('display', 'inline-block');
        actionBar.append(actionsMenu);

        // Set correct theme for action menu
        actionsMenu.find('li').hover(function() {
            setMenu2Theme($(this));
        }, function() {
            setMenu2Normal($(this));
        });

        // Create a division to hold actions menu
        var menuDiv = $('<div id="' + tableId + '_menuDiv" class="menuDiv"></div>');
        $('#' + tableId + '_length').prepend(menuDiv);
        $('#' + tableId + '_length').css({
            'padding': '0px',
            'width': '500px'
        });
        $('#' + tableId + '_filter').css('padding', '10px');
        menuDiv.append(actionBar);
    }

    // Resize accordion
    $('#zvmResourceAccordion').accordion('resize');
}

/**
 * Load zFCP pool contents into a table
 *
 * @param data HTTP request data
 */
function loadZfcpPoolTable(data) {
    if (typeof console == "object"){
        console.log("Entering loadZfcpPoolTable.");
    }
    // Delete loader if last one
    var panelId = 'zfcpResource';
    if (!zhcpQueryCountForZfcps) {
        $('#' + panelId).find('img[src="images/loader.gif"]').remove();
    }

    var hcp2zvm = new Object();
    var args, hcp, pool, tmp;
    if (typeof data.rsp != "undefined") {
        // Do not continue if the call failed
        if (!data.rsp.length && data.rsp[0].indexOf("Failed") > 0) {
            return;
        }

        // Obtain mapping for zHCP to zVM system
        hcp2zvm = getHcpZvmHash();

        args = data.msg.split(';');
        hcp = args[0].replace('hcp=', '');
        pool = args[1].replace('pool=', '');
        tmp = data.rsp[0].split(hcp + ': ');
    } else {
        // Provide empty values so the table will be generated
        hcp = '';
        pool = ''
        tmp = new Array();
    }

    // Resource tab ID
    var info = $('#' + panelId).find('.ui-state-highlight');
    // If there is no info bar, create info bar
    if (!info.length) {
        info = createInfoBar('Below are devices that are defined internally in the zFCP pools.');
        $('#' + panelId).append(info);
    }

    // Get datatable
    var tableId = 'zFcpDataTable';
    var dTable = getZfcpDataTable();
    if (!dTable) {
        // Create a datatable
        var table = new DataTable(tableId);
        // Resource headers: status, WWPN, LUN, size, owner, channel, tag
        table.init( [ '<input type="checkbox" onclick="selectAllDisk(event, $(this))">', 'z/VM', 'Pool', 'Status', 'Port name', 'Unit number', 'Size', 'Range', 'Owner', 'Channel', 'Tag' ]);

        // Append datatable to panel
        $('#' + panelId).append(table.object());

        // Turn into datatable
        dTable = $('#' + tableId).dataTable({
            'iDisplayLength': 50,
            "bScrollCollapse": true,
            "sScrollY": "400px",
            "sScrollX": "110%",
            "bAutoWidth": true,
            "oLanguage": {
                "oPaginate": {
                  "sNext": "",
                  "sPrevious": ""
                }
            }
        });
        setZfcpDataTable(dTable);
    }
    if ((typeof data.rsp != "undefined") && (data.rsp.length > 0)) {
        // Skip index 0 and 1 because it contains nothing
        var key = "";
        for (var i = 2; i < tmp.length; i++) {
            tmp[i] = jQuery.trim(tmp[i]);
            var diskAttrs = tmp[i].split(',');
            diskAttrs[0] = diskAttrs[0].toLowerCase();
            var key = hcp2zvm[hcp] + '-' + pool + '-' + diskAttrs[2];
            dTable.fnAddData( [ '<input type="checkbox" name="' + key + '"/>', hcp2zvm[hcp], pool, diskAttrs[0], diskAttrs[1], diskAttrs[2], diskAttrs[3], diskAttrs[4], diskAttrs[5], diskAttrs[6], diskAttrs[7] ]);
        }
    }
    // Create actions menu
    if (!$('#zFcpResourceActions').length) {
        // Empty filter area
        $('#' + tableId + '_length').empty();

        // Add disk to pool
        var addLnk = $('<a>Add</a>');
        addLnk.bind('click', function(event){
            openAddZfcp2PoolDialog();
        });

        // Delete disk from pool
        var removeLnk = $('<a>Remove</a>');
        removeLnk.bind('click', function(event){
            var disks = getNodesChecked(tableId);
            openRemoveZfcpFromPoolDialog(disks);
        });

        // Refresh table
        var refreshLnk = $('<a>Refresh</a>');
        refreshLnk.bind('click', function(event){
            $('#zfcpResource').empty().append(createLoader(''));
            setZfcpDataTable('');

            // Create a array for hardware control points
            var hcps = new Array();
            if ($.cookie('hcp').indexOf(',') > -1)
                hcps = $.cookie('hcp').split(',');
            else
                hcps.push($.cookie('hcp'));

            // Query the disk pools for each
            zhcpQueryCountForZfcps = hcps.length;
            for (var i in hcps) {
                if( !hcps[i] || 0 === hcps[i].length) continue;
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcps[i],
                        args : '--zfcppoolnames',
                        msg : hcps[i]
                    },

                    success : getZfcpPool
                });
                zhcpQueryCountForZfcps--;
            }
        });
        // Create action bar
        var actionBar = $('<div id="zFcpResourceActions" class="actionBar"></div>').css("width", "450px");

        // Create an action menu
        var actionsMenu = createMenu([addLnk, removeLnk, refreshLnk]);
        actionsMenu.superfish();
        actionsMenu.css('display', 'inline-block');
        actionBar.append(actionsMenu);

        // Set correct theme for action menu
        actionsMenu.find('li').hover(function() {
            setMenu2Theme($(this));
        }, function() {
            setMenu2Normal($(this));
        });

        // Create a division to hold actions menu
        var menuDiv = $('<div id="' + tableId + '_menuDiv" class="menuDiv"></div>');
        $('#' + tableId + '_length').prepend(menuDiv);
        $('#' + tableId + '_length').css({
            'padding': '0px',
            'width': '500px'
        });
        $('#' + tableId + '_filter').css('padding', '10px');
        menuDiv.append(actionBar);
    }

    // Resize accordion
    $('#zvmResourceAccordion').accordion('resize');
}

/**
 * Open dialog to remove disk from pool
 *
 * @param disks2remove Disks selected in table
 */
function openRemoveDiskFromPoolDialog(disks2remove) {
    // Create form to delete disk from pool
    var dialogId = 'zvmDeleteDiskFromPool';
    var deleteDiskForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Obtain mapping for zHCP to zVM system
    var hcp2zvm = new Object();
    hcp2zvm = getHcpZvmHash();

    var disks = new Array();
    if (disks2remove.indexOf(',') > -1)
        disks = disks2remove.split(',');
    else
        disks.push(disks2remove);

    // Pick the last zHCP and pool it finds
    var args, tgtHcp = "", tgtPool = "", tgtVol = "";
    for (var i in disks) {
        if( !disks[i] || 0 === disks[i].length) continue;
        args = disks[i].split('-');
        tgtHcp = args[0];
        tgtPool = args[1];
        tgtVol += args[2] + ',';
    }

    // Strip out last comma
    tgtVol = tgtVol.slice(0, -1);

    // Create info bar
    var info = createInfoBar('Remove a disk from a disk pool defined in the EXTENT CONTROL.');
    deleteDiskForm.append(info);
    var action = $('<div><label>Action:</label></div>');
    var actionSelect = $('<select name="action" title="The action to perform">'
            + '<option value=""></option>'
            + '<option value="1">Remove region</option>'
            + '<option value="2">Remove region from group</option>'
            + '<option value="3">Remove region from all groups</option>'
            + '<option value="7">Remove entire group</option>'
        + '</select>');
    action.append(actionSelect);

    var system = $('<div><label>z/VM system:</label></div>');
    var systemSelect = $('<select name="system" title="The z/VM system name"></select>');
    system.append(systemSelect);

    // Set region input based on those selected on table (if any)
    var region = $('<div><label>Volume name:</label><input type="text" name="region" value="' + tgtVol + '" title="The DASD volume label"/></div>');
    var group = $('<div><label>Group name:</label><input type="text" name="group" value="' + tgtPool + '" title="The name of the group from which the volume will be removed"/></div>');
    deleteDiskForm.append(action, system, region, group);

    // Append options for hardware control points
    //systemSelect.append($('<option value=""></option>'));
    for (var hcp in hcp2zvm) {
        systemSelect.append($('<option value="' + hcp2zvm[hcp] + '">' + hcp2zvm[hcp] + '</option>'));
    }
    systemSelect.val(tgtHcp);

    actionSelect.change(function() {
        if ($(this).val() == '1' || $(this).val() == '3') {
            region.show();
            group.hide();
        } else if ($(this).val() == '2') {
            region.show();
            group.show();
        } else if ($(this).val() == '7') {
            region.val('FOOBAR');
            region.hide();
            group.show();
        }
    });

    // Generate tooltips
    deleteDiskForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to delete disk
    deleteDiskForm.dialog({
        title:'Delete disk from pool',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 500,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                // Get inputs
                var action = $(this).find('select[name=action]').val();
                var system = $(this).find('select[name=system]').val();
                var region = $(this).find('input[name=region]').val();
                var group = $(this).find('input[name=group]').val();

                // If inputs are not complete, show warning message
                var ready = true;
                var args = new Array('select[name=system]', 'select[name=action]', 'input[name=region]', 'input[name=group]');
                for (var i in args) {
                    if (!$(this).find(args[i]).val()) {
                        $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                        ready = false;
                    } else {
                        $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                    }
                }

                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar('Please provide a value for each required field.');
                    warn.prependTo($(this));
                    return;
                }

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                var args;
                if (action == '2' || action == '7')
                    args = region + ';' + group;
                else
                    args = region;

                // Remove disk from pool
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'chhypervisor',
                        tgt : system,
                        args : '--removediskfrompool;' + action + ';' + args,
                        msg : dialogId
                    },

                    success : updateResourceDialog
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to add disk to pool
 */
function openAddDisk2PoolDialog() {
    // Create form to add disk to pool
    var dialogId = 'zvmAddDisk2Pool';
    var addDiskForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Obtain mapping for zHCP to zVM system
    var hcp2zvm = new Object();
    hcp2zvm = getHcpZvmHash();

    // Create info bar
    var info = createInfoBar('Add a disk to a disk pool defined in the EXTENT CONTROL. The disk has to already be attached to SYSTEM.');
    addDiskForm.append(info);
    var action = $('<div><label>Action:</label></div>');
    var actionSelect = $('<select name="action" title="The action to perform">'
            + '<option value=""></option>'
            + '<option value="4">Define region and add to group</option>'
            + '<option value="5">Add existing region to group</option>'
        + '</select>');
    action.append(actionSelect);

    var system = $('<div><label>z/VM system:</label></div>');
    var systemSelect = $('<select name="system" title="The z/VM system name"></select>');
    system.append(systemSelect);
    var volume = $('<div><label>Volume name:</label><input type="text" name="volume" title="The DASD volume label"/></div>');
    var group = $('<div><label>Group name:</label><input type="text" name="group" title="The name of the group to which the volume is assigned"/></div>');
    addDiskForm.append(action, system, volume, group);

    // Append options for hardware control points
    //systemSelect.append($('<option value=""></option>'));
    for (var hcp in hcp2zvm) {
        systemSelect.append($('<option value="' + hcp2zvm[hcp] + '">' + hcp2zvm[hcp] + '</option>'));
    }

    // Generate tooltips
    addDiskForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add disk
    addDiskForm.dialog({
        title:'Add disk to pool',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 500,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                // Get inputs
                var action = $(this).find('select[name=action]').val();
                var system = $(this).find('select[name=system]').val();
                var volume = $(this).find('input[name=volume]').val();
                var group = $(this).find('input[name=group]').val();

                // If inputs are not complete, show warning message
                var ready = true;
                var args = new Array('select[name=system]', 'select[name=action]', 'input[name=volume]', 'input[name=group]');
                for (var i in args) {
                    if (!$(this).find(args[i]).val()) {
                        $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                        ready = false;
                    } else {
                        $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                    }
                }

                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar('Please provide a value for each required field.');
                    warn.prependTo($(this));
                    return;
                }

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                var args;
                if (action == '4')
                    args = volume + ';' + volume + ';' + group;
                else
                    args = volume + ';' + group;

                // Add disk to pool
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'chhypervisor',
                        tgt : system,
                        args : '--adddisk2pool;' + action + ';' + args,
                        msg : dialogId
                    },

                    success : updateResourceDialog
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to remove zFCP from pool
 *
 * @param devices2remove Comman separated devices selected in table
 */
function openRemoveZfcpFromPoolDialog(devices2remove) {
    // Create form to delete device from pool
    var dialogId = 'zvmDeleteZfcpFromPool';
    var deleteDiskForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Obtain mapping for zHCP to zVM system
    var hcp2zvm = new Object();
    hcp2zvm = getHcpZvmHash();

    // Verify disks are in the same zFCP pool
    var devices = devices2remove.split(',');
    var tmp, tgtPool, tgtHcp;
    var tgtUnitNo = "";
    for (var i in devices) {
        if( !devices[i] || 0 === devices[i].length) continue;
        tmp = devices[i].split('-');

        if (tgtPool && tmp[1] != tgtPool) {
            openDialog("warn", "Please select devices in the same zFCP");
            return;
        } else {
            tgtPool = tmp[1];
        }

        tgtHcp = tmp[0];  // Assume it is just one zHCP. Otherwise, this cannot be done on multiple zHCPs.
        tgtUnitNo += tmp[2] + ",";
    }

    // Strip out last comma
    tgtUnitNo = tgtUnitNo.slice(0, -1);

    // Create info bar
    var info = createInfoBar('Remove a zFCP device that is defined in a zFCP pool.');
    deleteDiskForm.append(info);

    var system = $('<div><label>z/VM system:</label></div>');
    var systemSelect = $('<select name="system" title="The z/VM system name"></select>');
    system.append(systemSelect);

    var pool = $('<div><label>zFCP pool:</label><input type="text" name="zfcpPool" value="' + tgtPool + '" title="The pool where the disk resides"/></div>');
    var unitNo = $('<div><label>Unit number:</label><input type="text" name="zfcpUnitNo" value="' + tgtUnitNo + '" title="The hexadecimal digits representing the 8-byte logical unit number of the FCP-I/O device"/></div>');
    var portName = $('<div><label>Port name:</label><input type="text" name="zfcpPortName" title="Optional. The hexadecimal digits designating the 8-byte fibre channel port name of the FCP-I/O device"/></div>');
    deleteDiskForm.append(system, pool, unitNo, portName);

    // Append options for hardware control points
    //systemSelect.append($('<option value=""></option>'));
    for (var hcp in hcp2zvm) {
        systemSelect.append($('<option value="' + hcp2zvm[hcp] + '">' + hcp2zvm[hcp] + '</option>'));
    }
    systemSelect.val(tgtHcp);

    // Generate tooltips
    deleteDiskForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to delete device
    deleteDiskForm.dialog({
        title:'Delete device from pool',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 500,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                var system = $(this).find('select[name=system]').val();
                var pool = $(this).find('input[name=zfcpPool]').val();
                var unitNo = $(this).find('input[name=zfcpUnitNo]').val();
                var portName = $(this).find('input[name=zfcpPortName]').val();

                // If inputs are not complete, show warning message
                var ready = true;
                var args = new Array('select[name=system]', 'input[name=zfcpPool]', 'input[name=zfcpUnitNo]');
                for (var i in args) {
                    if (!$(this).find(args[i]).val()) {
                        $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                        ready = false;
                    } else {
                        $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                    }
                }

                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar('Please provide a value for each required field.');
                    warn.prependTo($(this));
                    return;
                }

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                var args = '--removezfcpfrompool;' + pool + ';' + unitNo;
                if (portName) {
                    args += ';' + portName;
                }
                $.ajax({
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'chhypervisor',
                        tgt : system,
                        args : args,
                        msg : dialogId
                    },

                    success : updateResourceDialog
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to add zFCP to pool
 */
function openAddZfcp2PoolDialog() {
    // Create form to add disk to pool
    var dialogId = 'zvmAddDisk2Pool';
    var addDiskForm = $('<div id="' + dialogId + '" class="form"></div>');
    var info = createInfoBar('Add a device to a zFCP pool defined in xCAT.');
    addDiskForm.append(info);

    // Obtain mapping for zHCP to zVM system
    var hcp2zvm = new Object();
    hcp2zvm = getHcpZvmHash();

    var system = $('<div><label>z/VM system:</label></div>');
    var systemSelect = $('<select name="system" title="The z/VM system name"></select>');
    system.append(systemSelect);

    var pool = $('<div><label>zFCP pool:</label><input type="text" name="zfcpPool" title="The pool where the disk is to be assigned"/></div>');
    var status = $('<div><label>Status:</label><select name="zfcpStatus" title="The status of the SCSI disk">'
            + '<option value="free">free</option>'
            + '<option value="used">used</option>'
        + '</select></div>');
    var portName = $('<div><label>Port name:</label><input type="text" name="zfcpPortName" title="The hexadecimal digits designating the 8-byte fibre channel port name of the FCP-I/O device"/></div>');
    var unitNo = $('<div><label>Unit number:</label><input type="text" name="zfcpUnitNo" title="The hexadecimal digits representing the 8-byte logical unit number of the FCP-I/O device"/></div>');
    var size = $('<div><label>Size:</label><input type="text" name="zfcpSize" title="The size of the disk to be added. The size can be in G or M. For example, 2G or 2048M."/></div>');
    var range = $('<div><label>Range:</label><input type="text" name="zfcpRange" title="The range of the dedicated FCP device channels where this device can be connected to"/></div>');
    var owner = $('<div><label>Owner:</label><input type="text" name="zfcpOwner" title="Optional. The node that currently owns this SCSI device."/></div>');
    addDiskForm.append(system, pool, status, portName, unitNo, size, range, owner);

    // Create a array for hardware control points
    //systemSelect.append($('<option value=""></option>'));
    // Append options for hardware control points
    for (var hcp in hcp2zvm) {
        systemSelect.append($('<option value="' + hcp2zvm[hcp] + '">' + hcp2zvm[hcp] + '</option>'));
    }

    // Generate tooltips
    addDiskForm.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add disk
    addDiskForm.dialog({
        title:'Add device to pool',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 500,
        buttons: {
            "Ok": function(){
                // Delete any warning messages
                $(this).find('.ui-state-error').remove();

                var tgtSystem = $(this).find('select[name=system]').val();
                var tgtPool = $(this).find('input[name=zfcpPool]').val();
                var tgtStatus = $(this).find('select[name=zfcpStatus]').val();
                var tgtPortName = $(this).find('input[name=zfcpPortName]').val();
                var tgtUnitNo = $(this).find('input[name=zfcpUnitNo]').val();
                var tgtSize = $(this).find('input[name=zfcpSize]').val();
                var tgtRange = $(this).find('input[name=zfcpRange]').val();

                // Device owner is optional
                var tgtOwner = "";
                if ($(this).find('input[name=zfcpOwner]').val()) {
                    tgtOwner = $(this).find('input[name=zfcpOwner]').val();
                }

                // If inputs are not complete, show warning message
                var ready = true;
                var args = new Array('select[name=system]', 'input[name=zfcpPool]', 'select[name=zfcpStatus]', 'input[name=zfcpPortName]', 'input[name=zfcpUnitNo]');
                for (var i in args) {
                    if (!$(this).find(args[i]).val()) {
                        $(this).find(args[i]).css('border', 'solid #FF0000 1px');
                        ready = false;
                    } else {
                        $(this).find(args[i]).css('border', 'solid #BDBDBD 1px');
                    }
                }

                if (!ready) {
                    // Show warning message
                    var warn = createWarnBar('Please provide a value for each required field.');
                    warn.prependTo($(this));
                    return;
                }

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                // zFCP range and owner are optional
                var args = '--addzfcp2pool||' + tgtPool + '||' + tgtStatus + '||"' + tgtPortName + '"||' + tgtUnitNo + '||' + tgtSize;
                if (tgtRange) {
                    args += '||' + tgtRange;
                } if (tgtOwner) {
                    args += '||' + tgtOwner;
                }

                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'chhypervisor',
                        tgt : tgtSystem,
                        args : args,
                        msg : dialogId
                    },

                    success : updateResourceDialog
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Update resource dialog
 *
 * @param data HTTP request data
 */
function updateResourceDialog(data) {
    var dialogId = data.msg;
    var infoMsg;

    // Create info message
    if (jQuery.isArray(data.rsp)) {
        infoMsg = '';
        for (var i in data.rsp) {
            infoMsg += data.rsp[i] + '</br>';
        }
    } else {
        infoMsg = data.rsp;
    }

    // Create info bar with close button
    var infoBar = $('<div class="ui-state-highlight ui-corner-all"></div>').css('margin', '5px 0px');
    var icon = $('<span class="ui-icon ui-icon-info"></span>').css({
        'display': 'inline-block',
        'margin': '10px 5px'
    });

    // Create close button to close info bar
    var close = $('<span class="ui-icon ui-icon-close"></span>').css({
        'display': 'inline-block',
        'float': 'right'
    }).click(function() {
        $(this).parent().remove();
    });

    var msg = $('<pre>' + infoMsg + '</pre>').css({
        'display': 'inline-block',
        'width': '90%'
    });

    infoBar.append(icon, msg, close);
    infoBar.prependTo($('#' + dialogId));
}

/**
 * Select all checkboxes in the datatable
 *
 * @param event Event on element
 * @param obj Object triggering event
 */
function selectAllDisk(event, obj) {
    // This will ascend from <input> <th> <tr> <thead> <table>
    var tableObj = obj.parents('.datatable');
    var status = obj.attr('checked');
    tableObj.find(' :checkbox').attr('checked', status);

    // Handle datatable scroll
    tableObj = obj.parents('.dataTables_scroll');
    if (tableObj.length) {
        tableObj.find(' :checkbox').attr('checked', status);
    }

    event.stopPropagation();
}

/**
 * Load network details into a table
 *
 * @param data HTTP request data
 */
function loadNetworkTable(data) {
    // Remove loader if last one
    var panelId = 'zvmNetworkResource';
    if (!zhcpQueryCountForNetworks) {
        $('#' + panelId).find('img[src="images/loader.gif"]').remove();
    }

    // Get zVM host names
    if (!$.cookie('zvms')) {
        $.ajax({
            url : 'lib/cmd.php',
            dataType : 'json',
            async: false,
            data : {
                cmd : 'webportal',
                tgt : '',
                args : 'lszvm',
                msg : ''
            },

            success : function(data) {
                setzVMCookies(data);
            }
        });
    }

    var zvms = $.cookie('zvms').split(',');
    var hcp2zvm = new Object();
    var args, zvm, iHcp, tmp;
    for (var i in zvms) {
        if( !zvms[i] || 0 === zvms[i].length) continue;
        args = zvms[i].split(':');
        zvm = args[0].toLowerCase();

        if (args[1].indexOf('.') != -1) {
            tmp = args[1].split('.');
            iHcp = tmp[0];
        } else {
            iHcp = args[1];
        }

        hcp2zvm[iHcp] = zvm;
    }

    var args = data.msg.split(';');
    var hcp = args[0].replace('hcp=', '');
    var type = args[1].replace('type=', '');
    var name = jQuery.trim(args[2].replace('network=', ''));
    tmp = data.rsp[0].split(hcp + ': ');

    // Resource tab ID
    var info = $('#' + panelId).find('.ui-state-highlight');
    // If there is no info bar
    if (!info.length) {
        // Create info bar
        info = createInfoBar('Below are LANs/VSWITCHes available to use.');
        $('#' + panelId).append(info);
    }

    // Get datatable
    var dTable = getNetworkDataTable();
    if (!dTable) {
        // Create table
        var tableId = 'zNetworkDataTable';
        var table = new DataTable(tableId);
        table.init( [ '<input type="checkbox" onclick="selectAllDisk(event, $(this))">', 'z/VM', 'Type', 'Name', 'Layer', 'Owner', 'Controller', 'Details' ]);

        // Append datatable to tab
        $('#' + panelId).append(table.object());

        // Turn into datatable
        dTable = $('#' + tableId).dataTable({
            'iDisplayLength': 50,
            "bScrollCollapse": true,
            "sScrollY": "400px",
            "sScrollX": "110%",
            "bAutoWidth": true,
            "oLanguage": {
                "oPaginate": {
                  "sNext": "",
                  "sPrevious": ""
                }
            }
        });
        setNetworkDataTable(dTable);

        // Set the column width
        var cols = table.object().find('thead tr th');
        cols.eq(0).css('width', '20px'); // HCP column
        cols.eq(1).css('width', '20px'); // Type column
        cols.eq(2).css('width', '20px'); // Name column
        cols.eq(3).css({'width': '600px'}); // Details column
    }

    // Skip index 0 because it contains nothing
    var details = '<pre style="text-align: left;">';
    for ( var i = 1; i < tmp.length; i++) {
        details += tmp[i];
    }
    details += '</pre>';

    // Determine the OSI layer
    var layer = "3";
    if (details.indexOf("ETHERNET") != -1) {
        layer = "2";
    }

    // Find the vSwitch/VLAN owner
    var regex = /(LAN|VSWITCH) (.*?)(?:\s|$)/g;
    var owner = "";
    var match = "";
    if (type == "VSWITCH") {
        owner = "SYSTEM";
    } else {
        owner = regex.exec(details)[2];
    }

    // Find the vSwitch controller
    regex = /(?:^|\s)Controller: (.*?)(?:\s|$)/g;
    var controllers = "";
    match = "";
    while (match = regex.exec(details)) {
        controllers += match[1] + ",";
    }
    controllers = controllers.substring(0, controllers.length - 1);  // Delete last two characters

    dTable.fnAddData(['<input type="checkbox" name="' + hcp2zvm[hcp] + ';' + type + ';' + name + ';' + owner + '"/>', '<pre>' + hcp2zvm[hcp] + '</pre>', '<pre>' + type + '</pre>', '<pre>' + name + '</pre>', '<pre>' + layer + '</pre>', '<pre>' + owner + '</pre>', '<pre>' + controllers + '</pre>', details]);

    // Create actions menu
    if (!$('#networkResourceActions').length) {
        // Empty filter area
        $('#' + tableId + '_length').empty();

        // Add Vswitch/Vlan
        var addLnk = $('<a>Add</a>');
        addLnk.bind('click', function(event){
            openAddVswitchVlanDialog();
        });

        // Remove Vswitch/Vlan
        var removeLnk = $('<a>Remove</a>');
        removeLnk.bind('click', function(event){
            var networkList = getNodesChecked(tableId).split(',');
            if (networkList) {
                openRemoveVswitchVlanDialog(networkList);
            }
        });

        // Refresh table
        var refreshLnk = $('<a>Refresh</a>');
        refreshLnk.bind('click', function(event){
            $('#zvmNetworkResource').empty().append(createLoader(''));
            setNetworkDataTable('');

            // Create a array for hardware control points
            var hcps = new Array();
            if ($.cookie('hcp').indexOf(',') > -1)
                hcps = $.cookie('hcp').split(',');
            else
                hcps.push($.cookie('hcp'));

            // Query networks
            zhcpQueryCountForNetworks = hcps.length;
            for (var i in hcps) {
                if( !hcps[i] || 0 === hcps[i].length) continue;
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : hcps[i],
                        args : '--getnetworknames',
                        msg : hcps[i]
                    },

                    success : getNetwork
                });
                zhcpQueryCountForNetworks--;
            }
        });

        // Create action bar
        var actionBar = $('<div id="networkResourceActions" class="actionBar"></div>').css("width", "450px");

        // Create an action menu
        var actionsMenu = createMenu([addLnk, removeLnk, refreshLnk]);
        actionsMenu.superfish();
        actionsMenu.css('display', 'inline-block');
        actionBar.append(actionsMenu);

        // Set correct theme for action menu
        actionsMenu.find('li').hover(function() {
            setMenu2Theme($(this));
        }, function() {
            setMenu2Normal($(this));
        });

        // Create a division to hold actions menu
        var menuDiv = $('<div id="' + tableId + '_menuDiv" class="menuDiv"></div>');
        $('#' + tableId + '_length').prepend(menuDiv);
        $('#' + tableId + '_length').css({
            'padding': '0px',
            'width': '500px'
        });
        $('#' + tableId + '_filter').css('padding', '10px');
        menuDiv.append(actionBar);
    }

    // Resize accordion
    $('#zvmResourceAccordion').accordion('resize');
}

/**
 * Connect a NIC to a Guest LAN
 *
 * @param data Data from HTTP request
 */
function connect2GuestLan(data) {
    var rsp = data.rsp;
    var args = data.msg.split(';');
    var node = args[0].replace('node=', '');
    var address = args[1].replace('addr=', '');
    var lanName = args[2].replace('lan=', '');
    var lanOwner = args[3].replace('owner=', '');

    // Write ajax response to status bar
    var prg = writeRsp(rsp, node + ': ');
    $('#' + node + 'StatusBar').find('div').append(prg);

    // Continue if no errors found
    if (data.rsp.length  && data.rsp[0].indexOf("Failed") == -1) {
        // Connect NIC to Guest LAN
        $.ajax( {
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'chvm',
                tgt : node,
                args : '--connectnic2guestlan;' + address + ';' + lanName + ';'
                    + lanOwner,
                msg : node
            },

            success : updateZNodeStatus
        });
    } else {
        // Hide loader when error
        var statusBarLoaderId = node + 'StatusBarLoader';
        $('#' + statusBarLoaderId).hide();
    }
}

/**
 * Connect a NIC to a VSwitch
 *
 * @param data Data from HTTP request
 */
function connect2VSwitch(data) {
    var rsp = data.rsp;
    var args = data.msg.split(';');
    var node = args[0].replace('node=', '');
    var address = args[1].replace('addr=', '');
    var vswitchName = args[2].replace('vsw=', '');
    var vswitchAware = args[3].replace('vlanaware=', '');
    var vswitchPortType = args[4].replace('porttype=', '');
    var vswitchLanId = args[5].replace('lanid=', '');

    // Set variables to empty string if notaware or they contain "default"
    if (vswitchAware.toLowerCase() == 'notaware' ) {
        vswitchPortType = '';
        vswitchLanId = '';
    } else {
        if (vswitchPortType.toLowerCase() == 'default' ) {
            vswitchPortType = '';
        }
        if (vswitchLanId.toLowerCase() == 'default' ) {
            vswitchLanId = '';
        }
    }

    // Write ajax response to status bar
    var prg = writeRsp(rsp, node + ': ');
    $('#' + node + 'StatusBar').find('div').append(prg);

    // Continue if no errors found
    if (data.rsp.length  && data.rsp[0].indexOf("Failed") == -1) {
        // Connect NIC to VSwitch
        $.ajax( {
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'chvm',
                tgt : node,
                args : '--connectnic2vswitch;' + address + ';' + vswitchName + ';'
                       + vswitchPortType + ';' + vswitchLanId,
                msg : node
            },

            success : updateZNodeStatus
        });
    } else {
        // Hide loader when error
        var statusBarLoaderId = node + 'StatusBarLoader';
        $('#' + statusBarLoaderId).hide();
    }
}

/**
 * Create provision existing node division
 *
 * @param inst Provision tab instance
 * @return Provision existing node division
 */
function createZProvisionExisting(inst) {
    // Create provision existing and hide it
    var provExisting = $('<div></div>').hide();

    var vmFS = $('<fieldset></fieldset>');
    var vmLegend = $('<legend>Virtual Machine</legend>');
    vmFS.append(vmLegend);
    provExisting.append(vmFS);

    var vmAttr = $('<div style="display: inline-table; vertical-align: middle; width: 85%; margin-left: 10px;"></div>');
    vmFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/computer.png"></img></div>'));
    vmFS.append(vmAttr);

    var osFS = $('<fieldset></fieldset>');
    var osLegend = $('<legend>Operating System</legend>');
    osFS.append(osLegend);
    provExisting.append(osFS);

    var osAttr = $('<div style="display: inline-table; vertical-align: middle;"></div>');
    osFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/operating_system.png"></img></div>'));
    osFS.append(osAttr);

    // Create group input
    var group = $('<div></div>');
    var groupLabel = $('<label>Group:</label>');
    group.append(groupLabel);

    // Turn on auto complete for group
    var groupNames = $.cookie('groups');
    if (groupNames) {
        // Split group names into an array
        var tmp = groupNames.split(',');

        // Create drop down for groups
        var groupSelect = $('<select title="The group name where the node is to be found"></select>');
        groupSelect.append('<option></option>');
        for (var i in tmp) {
            if( !tmp[i] || 0 === tmp[i].length) continue;
            // Add group into drop down
            var opt = $('<option value="' + tmp[i] + '">' + tmp[i] + '</option>');
            groupSelect.append(opt);
        }
        group.append(groupSelect);

        // Create node datatable
        groupSelect.change(function(){
            // Get group selected
            var thisGroup = $(this).val();
            // If a valid group is selected
            if (thisGroup) {
                createNodesDatatable(thisGroup, 'zNodesDatatableDIV' + inst);
            }
        });
    } else {
        // If no groups are cookied
        var groupInput = $('<input type="text" name="group"/>');
        group.append(groupInput);
    }
    vmAttr.append(group);

    // Create node input
    var node = $('<div></div>');
    var nodeLabel = $('<label>Nodes:</label>');
    var nodeDatatable = $('<div class="indent" id="zNodesDatatableDIV' + inst + '" style="display: inline-block; max-width: 800px;"><p>Select a group to view its nodes</p></div>');
    node.append(nodeLabel);
    node.append(nodeDatatable);
    vmAttr.append(node);

    // Create operating system image input
    var os = $('<div></div>');
    var osLabel = $('<label>Operating system image:</label>');
    var osSelect = $('<select name="os" title="The operating system image to be installed on this node"></select>');
    osSelect.append($('<option value=""></option>'));

    var imageNames = $.cookie('imagenames').split(',');
    if (imageNames) {
        imageNames.sort();
        for (var i in imageNames) {
            if( !imageNames[i] || 0 === imageNames[i].length) continue;
            osSelect.append($('<option value="' + imageNames[i] + '">' + imageNames[i] + '</option>'));
        }
    }
    os.append(osLabel);
    os.append(osSelect);
    osAttr.append(os);

    // Create boot method drop down
    var bootMethod = $('<div></div>');
    var methoddLabel = $('<label>Boot method:</label>');
    var methodSelect = $('<select name="bootMethod" title="The method for node deployment"></select>');
    methodSelect.append('<option value="boot">boot</option>'
        + '<option value="install">install</option>'
        + '<option value="iscsiboot">iscsiboot</option>'
        + '<option value="netboot">netboot</option>'
        + '<option value="statelite">statelite</option>'
    );
    bootMethod.append(methoddLabel);
    bootMethod.append(methodSelect);
    osAttr.append(bootMethod);

    // Generate tooltips
    provExisting.find('div input[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.7,
        predelay: 800,
        events: {
            def:     "mouseover,mouseout",
            input:   "mouseover,mouseout",
            widget:  "focus mouseover,blur mouseout",
            tooltip: "mouseover,mouseout"
        }
    });

    /**
     * Provision existing
     */
    var provisionBtn = createButton('Provision');
    provisionBtn.bind('click', function(event) {
        // Remove any warning messages
        $(this).parent().parent().find('.ui-state-error').remove();

        var ready = true;
        var errMsg = '';

        // Get provision tab ID
        var thisTabId = $(this).parent().parent().parent().attr('id');
        // Get provision tab instance
        var inst = thisTabId.replace('zvmProvisionTab', '');

        // Get nodes that were checked
        var dTableId = 'zNodesDatatable' + inst;
        var tgts = getNodesChecked(dTableId);
        if (!tgts) {
            errMsg += 'You need to select a node.<br>';
            ready = false;
        }

        // Check operating system image
        var os = $('#' + thisTabId + ' select[name=os]:visible');
        if (!os.val()) {
            errMsg += 'You need to select a operating system image.';
            os.css('border', 'solid #FF0000 1px');
            ready = false;
        } else {
            os.css('border', 'solid #BDBDBD 1px');
        }

        // If all inputs are valid, ready to provision
        if (ready) {
            // Disable provision button
            $(this).attr('disabled', 'true');

            // Show loader
            $('#zProvisionStatBar' + inst).show();
            $('#zProvisionLoader' + inst).show();

            // Disable all inputs
            var inputs = $('#' + thisTabId + ' input:visible');
            inputs.attr('disabled', 'disabled');

            // Disable all selects
            var selects = $('#' + thisTabId + ' select');
            selects.attr('disabled', 'disabled');

            // Get operating system image
            var osImage = $('#' + thisTabId + ' select[name=os]:visible').val();
            var tmp = osImage.split('-');
            var os = tmp[0];
            var arch = tmp[1];
            var profile = tmp[3];

            /**
             * (1) Set operating system
             */
            $.ajax( {
                url : 'lib/cmd.php',
                dataType : 'json',
                data : {
                    cmd : 'nodeadd',
                    tgt : '',
                    args : tgts + ';noderes.netboot=zvm;nodetype.os=' + os + ';nodetype.arch=' + arch + ';nodetype.profile=' + profile,
                    msg : 'cmd=nodeadd;out=' + inst
                },

                success : updateZProvisionExistingStatus
            });
        } else {
            // Show warning message
            var warn = createWarnBar(errMsg);
            warn.prependTo($(this).parent().parent());
        }
    });
    provExisting.append(provisionBtn);

    return provExisting;
}

/**
 * Create provision new node division
 *
 * @param inst Provision tab instance
 * @return Provision new node division
 */
function createZProvisionNew(inst) {
    if (typeof console == "object"){
       console.log("Entering createZProvisionNew. Inst value:"+inst);
    }
    // Create provision new node division
    var provNew = $('<div></div>');

    // Create VM fieldset
    var vmFS = $('<fieldset></fieldset>');
    var vmLegend = $('<legend>Virtual Machine</legend>');
    vmFS.append(vmLegend);
    provNew.append(vmFS);

    var vmAttr = $('<div style="display: inline-table; vertical-align: middle;"></div>');
    vmFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/computer.png"></img></div>'));
    vmFS.append(vmAttr);

    // Create OS fieldset
    var osFS = $('<fieldset></fieldset>');
    var osLegend = $('<legend>Operating System</legend>');
    osFS.append(osLegend);
    provNew.append(osFS);

    // Create hardware fieldset
    var hwFS = $('<fieldset></fieldset>');
    var hwLegend = $('<legend>Hardware</legend>');
    hwFS.append(hwLegend);
    provNew.append(hwFS);

    var hwAttr = $('<div style="display: inline-table; vertical-align: middle; width: 850px;"></div>');
    hwFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/hardware.png"></img></div>'));
    hwFS.append(hwAttr);

    // Create tabs for basic and advanced hardware configuration
    var hwTab = new Tab('hwConfig' + inst);
    hwTab.init();
    hwAttr.append(hwTab.object());

    var osAttr = $('<div style="display: inline-table; vertical-align: middle;"></div>');
    osFS.append($('<div style="display: inline-table; vertical-align: middle;"><img src="images/provision/operating_system.png"></img></div>'));
    osFS.append(osAttr);

    // Create group input
    var group = $('<div></div>');
    var groupLabel = $('<label>Group:</label>');
    var groupInput = $('<input type="text" name="group" title="You must give the group name that the node(s) will be placed under"/>');
    // Get groups on-focus
    groupInput.one('focus', function(){
        var groupNames = $.cookie('groups');
        if (groupNames) {
            // Turn on auto complete
            $(this).autocomplete({
                source: groupNames.split(',')
            });
        }
    });
    group.append(groupLabel);
    group.append(groupInput);
    vmAttr.append(group);

    // Create node input
    var nodeName = $('<div></div>');
    var nodeLabel = $('<label>Node:</label>');
    var nodeInput = $('<input type="text" name="nodeName" title="You must give a node or a node range. A node range must be given as: node1-node9 or node[1-9]."/>');
    nodeName.append(nodeLabel);
    nodeName.append(nodeInput);
    vmAttr.append(nodeName);

    // Create user ID input
    var userId = $('<div><label>User ID:</label><input type="text" name="userId" title="You must give a user ID or a user ID range. A user ID range must be given as: user1-user9 or user[1-9]."/></div>');
    vmAttr.append(userId);

    // Create hardware control point input
    var hcpDiv = $('<div></div>');
    var hcpNodeLabel = $('<label>HCP node name:</label>');
    var hcpNodeInput = $('<input type="text" name="hcpNode" title="You must give the xCAT node name for IBM z Systems hardware control point (zHCP) responsible for managing the node(s)"/>');
    var hcpHiddenInput = $('<input type="hidden" name="hcp"/input>');
    hcpNodeInput.blur(function() {

        if (typeof console == "object") {
            console.log("Display loading bar <zProvisionStatBar" + inst + ">");
        }
        // Show the status bar with a message and loading gif
        $('#'+'zProvisionStatBar'+inst).find('div').append("<b id=loadzhcp>Loading zhcp information...</b>");
        $('#'+'zProvisionStatBar'+inst).find('div').append("<img id='loadingpic' src='images/loader.gif'>");
        $('#'+'zProvisionStatBar'+inst).show();

        // list of calls after the zhcp is verified. Used to determine when in progress gif is to be removed.
        var ajaxCalls = {"diskpoolnames":1, "zfcppoolnames":1, "userprofilenames":1};
        var zhcpToCheck = $(this).val();
        var zhcpField = $(this);
        var provisionStatusBar = $('#'+'zProvisionStatBar'+inst);

        // Make sure border is set back to black
        zhcpField.css('border', 'solid #BDBDBD 1px');

        if ($(this).val()) {
                // Check if this is a valid node by making network names call.
            $.ajax({
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'lsvm',
                        tgt : zhcpToCheck,
                        args : '--getnetworknames',
                        msg : zhcpToCheck
                },

                success: function(data) {
                    if (data.rsp.length && (data.rsp[0].indexOf("Failed") > -1 || data.rsp[0].indexOf("Invalid") > -1) ) {
                        // Remove the progress gif, since bailing out
                        removeProvisionLoadingGif(provisionStatusBar);

                        // Create warning dialog
                        var warning = createWarnBar('Failure getting network data for hardware control point ' + zhcpToCheck + '<br>The hcp field must be a xCAT node name.');
                        var warnDialog = $('<div></div>').append(warning);

                        // highlight the hcp field
                        zhcpField.css('border', 'solid #FF0000 1px');

                        // Open warning dialog
                        warnDialog.dialog({
                            title:'Warning',
                            modal: true,
                            close: function(){
                                $(this).remove();
                            },
                            width: 400,
                            buttons: {
                                "Ok": function() {
                                    $(this).dialog("close");
                                }
                            }
                        });

                    } else {
                        // Node is good, now set some cookies from network, then check/set other cookies
                        setNetworkCookies(data);

                        // Get the HCP name from the hcp node name
                        $.ajax({
                                url : 'lib/cmd.php',
                                dataType : 'json',
                                data : {
                                    cmd : 'lsdef',
                                    tgt : '',
                                    args : zhcpToCheck,
                                    msg : 'zhcpFullName'
                            },

                            success: function(data) {
                                if (data.rsp.length && (data.rsp[0].indexOf("Failed") > -1 || data.rsp[0].indexOf("Invalid") > -1) ) {
                                    // Remove the progress gif, since bailing out
                                    removeProvisionLoadingGif(provisionStatusBar);

                                    // Create warning dialog
                                    var warning = createWarnBar('Failure getting hcp data from hardware control point ' + zhcpToCheck + '<br>The hcp field must be a valid xCAT node name.');
                                    var warnDialog = $('<div></div>').append(warning);

                                    // highlight the hcp field
                                    zhcpField.css('border', 'solid #FF0000 1px');

                                    // Open warning dialog
                                    warnDialog.dialog({
                                        title:'Warning',
                                        modal: true,
                                        close: function(){
                                            $(this).remove();
                                        },
                                        width: 400,
                                        buttons: {
                                            "Ok": function() {
                                                $(this).dialog("close");
                                            }
                                        }
                                    });
                                } else {
                                    // Now set the hidden hcp field with the full name
                                    // Clear hash table containing definable node attributes
                                    nodeAttrs = new Array();

                                    // Get definable attributes
                                    // Data returned
                                    var rsp = data.rsp;
                                    // Group name
                                    var group = data.msg;
                                    // Hash of node attributes
                                    var attrs = new Object();

                                    // Go through each attribute
                                    var node, args;
                                    for (var i in rsp) {
                                        // Get node name, skip processing
                                        if (rsp[i].indexOf('Object name:') > -1) {
                                            i++;
                                        }

                                        // Get key and value
                                        args = rsp[i].split('=', 2);
                                        var key = jQuery.trim(args[0]);
                                        var val = jQuery.trim(rsp[i].substring(rsp[i].indexOf('=') + 1, rsp[i].length));

                                        // If this is zhcp key then save full name in hidden field
                                        if (key == "hcp") {
                                            hcpHiddenInput.val(val);
                                        }

                                    }

                                }
                            }
                        });

                        if (typeof console == "object"){
                            console.log("Looking for cookies from <" + zhcpToCheck + ">");
                        }

                        if (!$.cookie(zhcpToCheck + 'diskpools')) {
                            // Get disk pools
                            $.ajax({
                                url : 'lib/cmd.php',
                                dataType : 'json',
                                data : {
                                    cmd : 'lsvm',
                                    tgt : zhcpToCheck,
                                    args : '--diskpoolnames',
                                    msg : zhcpToCheck
                                       },

                                success : setDiskPoolCookies,
                                complete : function() {
                                    checkProvisionCallsDone(provisionStatusBar, ajaxCalls, "diskpoolnames");
                                }
                            });
                        } else {
                            checkProvisionCallsDone(provisionStatusBar, ajaxCalls, "diskpoolnames");
                        }

                        if (!$.cookie(zhcpToCheck + 'zfcppools')) {
                            // Get zFCP pools
                            $.ajax({
                                url : 'lib/cmd.php',
                                dataType : 'json',
                                data : {
                                    cmd : 'lsvm',
                                    tgt : zhcpToCheck,
                                    args : '--zfcppoolnames',
                                    msg : zhcpToCheck
                                       },

                                success : setZfcpPoolCookies,
                                complete : function() {
                                    checkProvisionCallsDone(provisionStatusBar, ajaxCalls, "zfcppoolnames");
                                }
                            });
                        } else {
                            checkProvisionCallsDone(provisionStatusBar, ajaxCalls, "zfcppoolnames");
                        }

                        if (!$.cookie(zhcpToCheck + 'userprofiles')) {
                            // Get zFCP pools
                            $.ajax( {
                                url : 'lib/cmd.php',
                                dataType : 'json',
                                async: false,
                                data : {
                                    cmd : 'lsvm',
                                    tgt : zhcpToCheck,
                                    args : '--userprofilenames',
                                    msg : zhcpToCheck
                                            },

                                success : setUserProfilesCookies,
                                complete : function() {
                                    checkProvisionCallsDone(provisionStatusBar, ajaxCalls, "userprofilenames");
                                }
                            });
                        } else {
                            checkProvisionCallsDone(provisionStatusBar, ajaxCalls, "userprofilenames");
                        }

                        // Reset user profile and network drop down box
                        var thisTabId = zhcpField.parents('.tab').attr('id');
                        var thisUserProfile = $('#' + thisTabId + ' select[name=userProfile]');
                        thisUserProfile.children().remove();

                        var definedUserProfiles = $.cookie(zhcpToCheck + 'userprofiles').split(',');
                        for (var i in definedUserProfiles) {
                            if( !definedUserProfiles[i] || 0 === definedUserProfiles[i].length) continue;
                            thisUserProfile.append('<option value="' + definedUserProfiles[i] + '">' + definedUserProfiles[i] + '</option>');
                        }

                        var thisNetwork = $('#' + thisTabId + ' select[name=network]');
                        thisNetwork.children().remove();
                        thisNetwork.append('<option value=""></option>');  // No profile option
                        var definedNetworks = $.cookie(zhcpToCheck + 'networks').split(',');
                        for (var i in definedNetworks) {
                            if( !definedNetworks[i] || 0 === definedNetworks[i].length) continue;
                            if (!jQuery.trim(definedNetworks[i]))
                                continue;

                            var directoryEntry, interfaceName;

                            // Generate directory entry statement for vSwitch, hipersocket, and guest LAN
                            if (definedNetworks[i].indexOf('VSWITCH ') != -1) {
                                interfaceName = jQuery.trim(definedNetworks[i].replace('VSWITCH ', ''));
                                directoryEntry = "TYPE QDIO LAN " + interfaceName;
                            } else if (definedNetworks[i].indexOf('LAN:HIPERS ') != -1) {
                                interfaceName = jQuery.trim(definedNetworks[i].replace('LAN:HIPERS ', ''));
                                directoryEntry = "TYPE HIPERSOCKETS LAN " + interfaceName;
                            } else {
                                interfaceName = jQuery.trim(definedNetworks[i].replace('LAN:QDIO ', ''));
                                directoryEntry = "TYPE QDIO LAN " + interfaceName;
                            }

                            thisNetwork.append('<option value="' + directoryEntry + '">' + definedNetworks[i] + '</option>');
                        }

                        // Update user entry on change
                        thisNetwork.change(function() {
                            updateUserEntry(thisTabId);
                        });

                        thisUserProfile.change(function() {
                            updateUserEntry(thisTabId);
                        });
                    }
                }
            });
        }
    });
    hcpDiv.append(hcpNodeLabel);
    hcpDiv.append(hcpNodeInput);
    hcpDiv.append(hcpHiddenInput);
    vmAttr.append(hcpDiv);

    // Create an advanced link to set IP address and hostname
    var advancedLnk = $('<div><label><a style="color: blue; cursor: pointer;">Advanced</a></label></div>');
    vmAttr.append(advancedLnk);
    var advanced = $('<div style="margin-left: 20px;"></div>').hide();
    vmAttr.append(advanced);

    var ip = $('<div><label>IP address:</label><input type="text" name="ip" ' +
        'title="Optional. Specify the IP address that will be assigned to this node. An IP address must be given in the following format: 192.168.0.1."/></div>');
    advanced.append(ip);
    var hostname = $('<div><label>Hostname:</label><input type="text" name="hostname" ' +
        'title="Optional. Specify the hostname that will be assigned to this node. A hostname <= 70 characters must be given in the following format: ihost1.sourceforge.net."/></div>');
    advanced.append(hostname);

    // Show IP address and hostname inputs on-click
    advancedLnk.click(function() {
        advanced.toggle();
    });

    // Create operating system image input
    var os = $('<div></div>');
    var osLabel = $('<label>Operating system image:</label>');
    var osSelect = $('<select name="os" title="The operating system image to be installed on this node"></select>');
    osSelect.append($('<option value=""></option>'));

    var imageNames = $.cookie('imagenames').split(',');
    if (imageNames) {
        imageNames.sort();
        for (var i in imageNames) {
            if( !imageNames[i] || 0 === imageNames[i].length) continue;
            osSelect.append($('<option value="' + imageNames[i] + '">' + imageNames[i] + '</option>'));
        }
    }
    os.append(osLabel);
    os.append(osSelect);
    osAttr.append(os);

    // Create user entry input
    var defaultChkbox = $('<input type="checkbox" name="userEntry" value="default"/>').click(function() {
        // Remove any warning messages
        $(this).parents('.form').find('.ui-state-error').remove();

        // Get tab Id
        var thisTabId = $(this).parents('.ui-tabs-panel').parents('.ui-tabs-panel').attr('id');

        // Get objects for HCP, user ID, and OS
        var userId = $('#' + thisTabId + ' input[name=userId]');
        var os = $('#' + thisTabId + ' select[name=os]');

        // Get default user entry when clicked
        if ($(this).attr('checked')) {
            if (!os.val() || !userId.val()) {
                // Show warning message
                var warn = createWarnBar('Please specify the operating system and user ID before checking this box');
                warn.prependTo($(this).parents('.form'));

                // Highlight empty fields
                jQuery.each([os, userId], function() {
                    if (!$(this).val()) {
                        $(this).css('border', 'solid #FF0000 1px');
                    }
                });
            } else {
                // Un-highlight empty fields
                jQuery.each([os, userId], function() {
                    $(this).css('border', 'solid #BDBDBD 1px');
                });

                // Get profile name
                var tmp = os.val().split('-');
                var profile = tmp[3];

                $.ajax({
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'webrun',
                        tgt : '',
                        args : 'getdefaultuserentry;' + profile,
                        msg : thisTabId
                    },

                    success:function(data) {
                        // Populate user entry
                        var tabId = data.msg;
                        var entry = new String(data.rsp);
                        var userId = $('#' + tabId + ' input[name=userId]').val();
                        entry = entry.replace(new RegExp('LXUSR', 'g'), userId);
                        $('#' + tabId + ' textarea:visible').val(entry);
                    }
                });
            }
        } else {
            $('#' + thisTabId + ' textarea:visible').val('');

            // Un-highlight empty fields
            jQuery.each([os, userId], function() {
                $(this).css('border', 'solid #BDBDBD 1px');
            });
        }
    });
    var userEntry = $('<div><label style="vertical-align: top;">Directory entry:</label><textarea title="The directory entry to be defined for the virtual machine"/></textarea></div>');
    userEntry.append($('<span></span>').append(defaultChkbox, 'Use default'));

    // Add division on basic tab for specifying: memory, # of CPUs, privilege, user profile, and network.
    var basicConfig = $('<div></div>');
    var userProfile = $('<div><label>z/VM profile:</label><select name="userProfile" title="The profile containing the desired attributes of the virtual machine">' +
            '<option value="">Select a hardware control point</option>' +
        '</select></div>');
    var cpuSelect = $('<select name="cpuCount" title="The number of CPUs assigned to the virtual machine">' +
            '<option value=""></option>' +
            '<option value="1">1</option>' +
            '<option value="2">2</option>' +
            '<option value="3">3</option>' +
            '<option value="4">4</option>' +
            '<option value="5">5</option>' +
            '<option value="6">6</option>' +
            '<option value="7">7</option>' +
            '<option value="8">8</option>' +
        '</select>').change(function() {
            updateUserEntry('zvmProvisionTab' + inst);
    });
    var cpuCount = $('<div><label>CPU count:</label></div>').append(cpuSelect);
    var memorySlider = $('<div style="width:400px; display:inline-table; vertical-align:middle; margin-right: 10px;"></div>');
    var memorySize = $('<input type="text" style="width: 80px; border-width: 0px;" name="memory" readonly="readonly" title="The memory size of the virtual machine"></input>');
    var memory = $('<div><label>Memory size:</label></div>').append(memorySlider, memorySize);
    var acceptableMemorySize = ['512M', '1024M', '2G', '3G', '4G', '5G', '6G', '7G', '8G'];
    memorySlider.slider({
        value: 0,
        min: 0,
        max: 8,
        step: 1,
        slide: function(event, ui) {
            $('#basicConfig' + inst + ' input[name=memory]').val(acceptableMemorySize[ui.value]);

            // Update user entry on change
            updateUserEntry('zvmProvisionTab' + inst);
        }
    });

    // Initialize storage size
    memorySize.val(acceptableMemorySize[0]);

    var privilege = $('<div><label style="vertical-align: top;">Privileges:</label>' +
            '<div style="display:inline-block;">' +
                '<span><input type="checkbox" name="privilege" value="A"/> A - Primary system operator</span><br/>' +
                '<span><input type="checkbox" name="privilege" value="B"/> B - System resource operator</span><br/>' +
                '<span><input type="checkbox" name="privilege" value="C"/> C - System programmer</span><br/>' +
                '<span><input type="checkbox" name="privilege" value="D"/> D - Spooling operator</span><br/>' +
                '<span><input type="checkbox" name="privilege" value="E"/> E - System analyst</span><br/>' +
                '<span><input type="checkbox" name="privilege" value="F"/> F - IBM service representative</span><br/>' +
                '<span><input type="checkbox" name="privilege" value="G" checked/> G - General user</span><br/>' +
            '</div>' +
        '</div>');
    privilege.find('input').change(function() {
        updateUserEntry('zvmProvisionTab' + inst);
    });

    var network = $('<div><label>Network interface:</label><select name="network" title="The profile containing the desired attributes of the virtual machine">' +
            '<option value="">Select a hardware control point</option>' +
        '</select></div>');

    var vswitchvlan = $('<div id="vlandiv"> <label>Vswitch GRANT details.</label><br><label>Porttype:</label><select name="vswitchporttype" title="The VSwitch porttype to be granted.">' +
            '<option value="default">default</option>' +'<option value="ACCESS">ACCESS</option>' + '<option value="TRUNK">TRUNK</option>' + '</select>' +
                        '<br><label>VLAN id:</label><input name="vswitchvlanid" id="vswitchvlanid" type="text" size="19" maxlength="19" value="default" title="The VLAN id to be granted."/>' +
                        '</div>');
    vswitchvlan.find('input').change(function() {
        updateUserEntry('zvmProvisionTab' + inst);
    });
    vswitchvlan.find('select').change(function() {
        updateUserEntry('zvmProvisionTab' + inst);
    });

    vswitchvlan.hide();
    basicConfig.append(userProfile, cpuCount, memory, privilege, network, vswitchvlan);
    hwTab.add('basicConfig' + inst, 'Basic', basicConfig, false);

    // Add division on advanced tab for specifying user directory entry
    hwTab.add('advancedConfig' + inst, 'Advanced', userEntry, false);

    // Create disk table
    var diskDiv = $('<div class="provision"></div>');
    var diskLabel = $('<label style="width: 50px;">Disks:</label>');
    var diskTable = $('<table style="width: 750px;"></table>');
    var diskHeader = $('<thead class="ui-widget-header"> <th></th> <th>Type</th> <th>Address</th> <th>Size</th> <th>Mode</th> <th>Pool</th> <th>Password</th> <th>IPL<input type="radio" name="ipl" checked/>None<br></th></thead>');
    // Adjust header width
    diskHeader.find('th').css( {
        'width' : '80px'
    });
    diskHeader.find('th').eq(0).css( {
        'width' : '20px'
    });
    var diskBody = $('<tbody></tbody>');
    var diskFooter = $('<tfoot></tfoot>');

    /**
     * Add disks
     */
    var addDiskLink = $('<a>Add disk</a>');
    addDiskLink.bind('click', function(event) {
        // Get list of disk pools
        var thisTabId = $(this).parents('.tab').attr('id');
        var thisHcp = $('#' + thisTabId + ' input[name=hcp]').val();
        var definedPools = null;
        if (thisHcp) {
            // Get node without domain name
            var temp = thisHcp.split('.');
            definedPools = $.cookie(temp[0] + 'diskpools').split(',');
        } else {
            var warning = createWarnBar('You must fill in a hardware control point before adding a disk.');
            var warnDialog = $('<div></div>').append(warning);

            // Open dialog
            warnDialog.dialog({
                title:'Warning',
                modal: true,
                close: function(){
                  $(this).remove();
                },
                width: 400,
                buttons: {
                    "Ok": function() {
                        $(this).dialog("close");
                    }
               }
            });
            return false;
        }

        // Create a row
        var diskRow = $('<tr></tr>');

        // Add remove button
        var removeBtn = $('<span class="ui-icon ui-icon-close"></span>');
        var col = $('<td></td>').append(removeBtn);
        removeBtn.bind('click', function(event) {
            diskRow.remove();
        });
        diskRow.append(col);

        // Create disk type drop down
        var diskType = $('<td></td>');
        var diskTypeSelect = $('<select title="The device type of the volume to which the disk is assigned"></select>');
        diskTypeSelect.append('<option value="3390">3390</option>'
            + '<option value="9336">9336</option>'
        );
        diskType.append(diskTypeSelect);
        diskRow.append(diskType);

        // Create disk address input
        var diskAddr = $('<td><input type="text" title="You must give the virtual device address of the disk to be added"/></td>');
        diskRow.append(diskAddr);

        // Create disk size input
        var diskSize = $('<td><input type="text" title="You must give the size of the disk to be created.  The size value is one of the following: cylinders or block size. "/></td>');
        diskRow.append(diskSize);

        // Create disk mode input
        var diskMode = $('<td></td>');
        var diskModeSelect = $('<select title="The access mode for the disk"></select>');
        diskModeSelect.append('<option value="R">R</option>'
            + '<option value="RR">RR</option>'
            + '<option value="W">W</option>'
            + '<option value="WR">WR</option>'
            + '<option value="M">M</option>'
            + '<option value="MR">MR</option>'
            + '<option value="MW">MW</option>'
        );
        diskMode.append(diskModeSelect);
        diskRow.append(diskMode);

        // Create disk pool drop down
        var diskPool = $('<td></td>');
        var diskPoolSelect = $('<select title="The pool where the disk is to be found"></select>');
        for (var i in definedPools) {
            diskPoolSelect.append('<option value="' + definedPools[i] + '">' + definedPools[i] + '</option>');
        }
        diskPool.append(diskPoolSelect);
        diskRow.append(diskPool);

        // Create disk password input
        var diskPw = $('<td><input type="password" title="Optional. The read, write, and multi password that will be used for accessing the disk."/></td>');
        diskRow.append(diskPw);

        // Create IPL checkbox
        //var diskIpl = $('<td><input type="checkbox" name="ipl" title="Optional. Set the ECKD/FBA disk as the device to be IPL"/></td>');
        var diskIpl = $('<td><input type="radio" name="ipl" title="Optional. Set the ECKD/FBA disk as the device to be IPL"/></td>');
        diskRow.append(diskIpl);
        diskIpl.find('input').change(function() {
            updateUserEntry(thisTabId);
        });

        diskBody.append(diskRow);

        // Generate tooltips
        diskBody.find('td input[title],select[title]').tooltip({
            position: "top right",
            offset: [-4, 4],
            effect: "fade",
            opacity: 0.7,
            predelay: 800,
            events: {
                def:     "mouseover,mouseout",
                input:   "mouseover,mouseout",
                widget:  "focus mouseover,blur mouseout",
                tooltip: "mouseover,mouseout"
            }
        });
    });

    // Create disk table
    diskFooter.append(addDiskLink);
    diskTable.append(diskHeader);
    diskTable.append(diskBody);
    diskTable.append(diskFooter);

    diskDiv.append(diskLabel);
    diskDiv.append(diskTable);
    hwAttr.append(diskDiv);

    // Create zFCP table
    var zfcpDiv = $('<div class="provision"></div>');
    var zfcpLabel = $('<label style="width: 50px;">zFCP:</label>');
    var zfcpTable = $('<table style="width: 750px;"></table>');
    var zfcpHeader = $('<thead class="ui-widget-header"> <th><th>Address</th> <th>Size</th> <th>Pool</th> <th>Tag</th> <th>Port Name</th> <th>Unit #</th> <th>LOADDEV</th></thead>');
    // Adjust header width
    zfcpHeader.find('th').css({
        'width' : '80px'
    });
    zfcpHeader.find('th').eq(0).css({
        'width' : '20px'
    });
    var zfcpBody = $('<tbody></tbody>');
    var zfcpFooter = $('<tfoot></tfoot>');

    /**
     * Add zFCP devices
     */
    var addZfcpLink = $('<a>Add zFCP</a>');
    addZfcpLink.bind('click', function(event) {
        // Get list of disk pools
        var thisTabId = $(this).parents('.tab').attr('id');
        var thisHcp = $('#' + thisTabId + ' input[name=hcp]').val();
        var definedPools = null;
        if (thisHcp) {
            // Get node without domain name
            var temp = thisHcp.split('.');
            definedPools = $.cookie(temp[0] + 'zfcppools').split(',');
        } else {
            var warning = createWarnBar('You must fill in a hardware control point before adding a zFCP.');
            var warnDialog = $('<div></div>').append(warning);

            // Open dialog
            warnDialog.dialog({
                title:'Warning',
                modal: true,
                close: function(){
                  $(this).remove();
                },
                width: 400,
                buttons: {
                    "Ok": function() {
                        $(this).dialog("close");
                    }
               }
            });

        }

        // Create a row
        var zfcpRow = $('<tr></tr>');

        // Add remove button
        var removeBtn = $('<span class="ui-icon ui-icon-close"></span>');
        var col = $('<td></td>').append(removeBtn);
        removeBtn.bind('click', function(event) {
            zfcpRow.remove();
        });
        zfcpRow.append(col);

        // Create disk address input
        var zfcpAddr = $('<td><input type="text" name="zfcpAddr" title="You must give the virtual device address of the device to be added"/></td>');
        zfcpRow.append(zfcpAddr);

        // Create disk size input
        var zfcpSize = $('<td><input type="text" name="zfcpSize" title="You must give the size of the device to be added.  The size value can be one of the following: G(igabtye) or M(egabyte). "/></td>');
        zfcpRow.append(zfcpSize);

        // Create zFCP pool drop down
        var zfcpPool = $('<td></td>');
        var zfcpPoolSelect = $('<select name="zfcpPool" title="The pool where the new disk is to be found"></select>');
        for (var i in definedPools) {
            zfcpPoolSelect.append('<option value="' + definedPools[i] + '">' + definedPools[i] + '</option>');
        }
        zfcpPool.append(zfcpPoolSelect);
        zfcpRow.append(zfcpPool);

        // Create disk tag
        var zfcpTag = $('<td><input type="text" name="zfcpTag" title="Optional. You can give a tag for the device. The tag determines how this device will be used."/></td>');
        zfcpRow.append(zfcpTag);

        // Create device port name
        var zfcpPortName = $('<td><input type="text" name="zfcpPortName" title="Optional. You can give the world wide port name for the device."/></td>');
        zfcpRow.append(zfcpPortName);

        // Create device unit number
        var zfcpUnitNo = $('<td><input type="text" name="zfcpUnitNo" title="Optional. You can give the logical unit number for the device."/></td>');
        zfcpRow.append(zfcpUnitNo);

        // Create LOADDEV radio button
        var zfcpLoaddev = $('<td><input type="radio" name="zfcpLoaddev" title="Optional. Set the SCSI disk as the device to be loaded on IPL"/></td>');
        zfcpRow.append(zfcpLoaddev);

        zfcpBody.append(zfcpRow);

        // Generate tooltips
        zfcpBody.find('td input[title],select[title]').tooltip({
            position: "top right",
            offset: [-4, 4],
            effect: "fade",
            opacity: 0.7,
            predelay: 800,
            events: {
                def:     "mouseover,mouseout",
                input:   "mouseover,mouseout",
                widget:  "focus mouseover,blur mouseout",
                tooltip: "mouseover,mouseout"
            }
        });
    });

    zfcpFooter.append(addZfcpLink);
    zfcpTable.append(zfcpHeader);
    zfcpTable.append(zfcpBody);
    zfcpTable.append(zfcpFooter);

    zfcpDiv.append(zfcpLabel);
    zfcpDiv.append(zfcpTable);
    hwAttr.append(zfcpDiv);

    // Generate tooltips
    provNew.find('div input[title],select[title],textarea[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.7,
        predelay: 800,
        events: {
            def:     "mouseover,mouseout",
            input:   "mouseover,mouseout",
            widget:  "focus mouseover,blur mouseout",
            tooltip: "mouseover,mouseout"
        }
    });

    // Disable IPL column if advanced tab is selected
    hwTab.object().tabs({
        select: function(event, ui) {
            // Get provision tab instance
            var thisTabId = $(this).parents('.ui-tabs-panel').attr('id');
            var inst = thisTabId.replace('zvmProvisionTab', '');

            // Disable and de-select IPL device
            if (ui.index == 1) {
                $('#' + thisTabId + ' table:eq(0):visible tbody tr td:nth-child(8) input').attr('disabled','disabled');
            } else {
                $('#' + thisTabId + ' table:eq(0):visible tbody tr td:nth-child(8) input').removeAttr('disabled');
            }

            $('#' + thisTabId + ' table:eq(0):visible tbody tr td:nth-child(8) input').removeAttr('checked');
        }
    });

    /**
     * Provision new
     */
    var provisionBtn = createButton('Provision');
    provisionBtn.bind('click', function(event) {
        // Remove any warning messages
        $(this).parent().parent().find('.ui-state-error').remove();

        var ready = true;
        var errMsg = '';

        // Get tab ID
        var thisTabId = $(this).parents('.ui-tabs-panel').attr('id');
        // Get provision tab instance
        var inst = thisTabId.replace('zvmProvisionTab', '');

        // Get the selected hardware configuration tab
        // Basic tab index = 0 & advanced tab index = 1
        var hwTabIndex = $("#hwConfig" + inst).tabs('option', 'selected');

        // Check node name, userId, hardware control point, and group
        // Check disks and zFCP devices
        var inputs = $('#' + thisTabId + ' input:visible');
        for (var i = 0; i < inputs.length; i++) {
            // Do not check some inputs
            if (inputs.eq(i).attr('name') == 'memory') {
                // There should always be a value for memory
                // Do not change the border
                continue;
            } else if (!inputs.eq(i).val()
                && inputs.eq(i).attr('type') != 'password'
                && inputs.eq(i).attr('name') != 'zfcpTag'
                && inputs.eq(i).attr('name') != 'zfcpPortName'
                && inputs.eq(i).attr('name') != 'zfcpUnitNo') {
                inputs.eq(i).css('border', 'solid #FF0000 1px');
                ready = false;
            } else {
                inputs.eq(i).css('border', 'solid #BDBDBD 1px');
            }
        }

        var selects = $('#' + thisTabId + ' select:visible');
        for (var i = 0; i < selects.length; i++) {
            if (!selects.eq(i).val() && selects.eq(i).attr('name') != 'os' && selects.eq(i).attr('name') != 'userProfile' && selects.eq(i).attr('name') != 'network') {
                selects.eq(i).css('border', 'solid #FF0000 1px');
                ready = false;
            } else {
                selects.eq(i).css('border', 'solid #BDBDBD 1px');
            }
        }

        if (hwTabIndex == 1) {
            // Check user entry
            var thisUserEntry = $('#' + thisTabId + ' textarea:visible');
            thisUserEntry.val(thisUserEntry.val().toUpperCase());
            if (!thisUserEntry.val()) {
                thisUserEntry.css('border', 'solid #FF0000 1px');
                ready = false;
            } else {
                thisUserEntry.css('border', 'solid #BDBDBD 1px');
            }

            // Check if user entry contains user ID
            var thisUserId = $('#' + thisTabId + ' input[name=userId]:visible');
            var pos = thisUserEntry.val().indexOf('USER ' + thisUserId.val().toUpperCase());
            if (pos < 0) {

                pos = thisUserEntry.val().indexOf('IDENTITY ' + thisUserId.val().toUpperCase());
                if (pos < 0) {
                    errMsg = errMsg + 'The directory entry does not contain the correct user/identity ID.<br/>';
                    ready = false;
                }
            }
        }
        var hostnameCheck = $('#' + thisTabId + ' input[name=hostname]').val();
        if (hostnameCheck.length > 70) {
            errMsg = errMsg + 'The host name cannot be longer than 70 characters.<br/>';
            $('#' + thisTabId + ' input[name=hostname]').css('border', 'solid #FF0000 1px');
            ready = false;
        }

        // Show error message for missing inputs
        if (!ready) {
            errMsg = errMsg + 'Please provide a value for each missing field.<br/>';
        }

        // If no operating system is specified, create only user entry
        os = $('#' + thisTabId + ' select[name=os]:visible');

        // Check number of disks
        var diskRows = $('#' + thisTabId + ' table tr');
        // If an OS is given, disks are needed
        if (os.val() && (diskRows.length < 1)) {
            errMsg = errMsg + 'You need to add at some disks.<br/>';
            ready = false;
        }

        // If inputs are valid, ready to provision
        if (ready) {
            // Generate user directory entry if basic tab is selected
            if (hwTabIndex == 0) {
                updateUserEntry(thisTabId);
            }

            if (!os.val()) {
                // If no OS is given, create a virtual server
                var msg = '';
                if (diskRows.length > 0) {
                    msg = 'Do you want to create a virtual server without an operating system?';
                } else {
                    // If no disks are given, create a virtual server (no disk)
                    msg = 'Do you want to create a virtual server without an operating system or disks?';
                }

                // Open dialog to confirm
                var confirmDialog = $('<div><p>' + msg + '</p></div>');
                confirmDialog.dialog({
                    title:'Confirm',
                    modal: true,
                    close: function(){
                        $(this).remove();
                    },
                    width: 400,
                    buttons: {
                        "Ok": function(){
                            // Disable provision button
                            provisionBtn.attr('disabled', 'true');

                            // Show loader
                            $('#zProvisionStatBar' + inst).show();
                            $('#zProvisionLoader' + inst).show();

                            // Disable add disk button
                            addDiskLink.attr('disabled', 'true');

                            // Disable close button on disk table
                            $('#' + thisTabId + ' table span').unbind('click');

                            // Disable all inputs
                            var inputs = $('#' + thisTabId + ' input');
                            inputs.attr('disabled', 'disabled');

                            // Disable all selects
                            var selects = $('#' + thisTabId + ' select');
                            selects.attr('disabled', 'disabled');

                            // Add a new line at the end of the user entry
                            var textarea = $('#' + thisTabId + ' textarea');
                            var tmp = jQuery.trim(textarea.val());
                            textarea.val(tmp + '\n');
                            textarea.attr('readonly', 'readonly');
                            textarea.css( {
                                'background-color' : '#F2F2F2'
                            });

                            // Get node name
                            var node = $('#' + thisTabId + ' input[name=nodeName]').val();
                            // Get userId
                            var userId = $('#' + thisTabId + ' input[name=userId]').val();
                            // Get hardware control point
                            var hcp = $('#' + thisTabId + ' input[name=hcp]').val();
                            // Get group
                            var group = $('#' + thisTabId + ' input[name=group]').val();
                            // Get IP address and hostname
                            var ip = $('#' + thisTabId + ' input[name=ip]').val();
                            var hostname = $('#' + thisTabId + ' input[name=hostname]').val();

                            // Generate arguments to sent
                            var args = node + ';zvm.hcp=' + hcp
                                + ';zvm.userid=' + userId
                                + ';nodehm.mgt=zvm'
                                + ';groups=' + group;
                            if (ip)
                                args += ';hosts.ip=' + ip;

                            if (hostname)
                                args += ';hosts.hostnames=' + hostname;

                            /**
                             * (1) Define node
                             */
                            $.ajax( {
                                url : 'lib/cmd.php',
                                dataType : 'json',
                                data : {
                                    cmd : 'nodeadd',
                                    tgt : '',
                                    args : args,
                                    msg : 'cmd=nodeadd;out=' + inst
                                },

                                success : updateZProvisionNewStatus
                            });

                            $(this).dialog("close");
                        },
                        "Cancel": function() {
                            $(this).dialog("close");
                        }
                    }
                });
            } else {
                /**
                 * Create a virtual server and install OS
                 */

                // Disable provision button
                $(this).attr('disabled', 'true');

                // Show loader
                $('#zProvisionStatBar' + inst).show();
                $('#zProvisionLoader' + inst).show();

                // Disable add disk button
                addDiskLink.attr('disabled', 'true');

                // Disable close button on disk table
                $('#' + thisTabId + ' table span').unbind('click');

                // Disable all inputs
                var inputs = $('#' + thisTabId + ' input');
                inputs.attr('disabled', 'disabled');
                inputs.css( {
                    'background-color' : '#F2F2F2'
                });

                // Disable all selects
                var selects = $('#' + thisTabId + ' select');
                selects.attr('disabled', 'disabled');
                selects.css( {
                    'background-color' : '#F2F2F2'
                });

                // Add a new line at the end of the user entry
                var textarea = $('#' + thisTabId + ' textarea');
                var tmp = jQuery.trim(textarea.val());
                textarea.val(tmp + '\n');
                textarea.attr('readonly', 'readonly');
                textarea.css( {
                    'background-color' : '#F2F2F2'
                });

                // Get node name
                var node = $('#' + thisTabId + ' input[name=nodeName]').val();
                // Get userId
                var userId = $('#' + thisTabId + ' input[name=userId]').val();
                // Get hardware control point
                var hcp = $('#' + thisTabId + ' input[name=hcp]').val();
                // Get group
                var group = $('#' + thisTabId + ' input[name=group]').val();
                // Get IP address and hostname
                var ip = $('#' + thisTabId + ' input[name=ip]').val();
                var hostname = $('#' + thisTabId + ' input[name=hostname]').val();

                // Generate arguments to sent
                var args = node + ';zvm.hcp=' + hcp
                    + ';zvm.userid=' + userId
                    + ';nodehm.mgt=zvm'
                    + ';groups=' + group;
                if (ip)
                    args += ';hosts.ip=' + ip;

                if (hostname)
                    args += ';hosts.hostnames=' + hostname;

                /**
                 * (1) Define node
                 */
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'nodeadd',
                        tgt : '',
                        args : args,
                        msg : 'cmd=nodeadd;out=' + inst
                    },

                    success : updateZProvisionNewStatus
                });
            }
        } else {
            // Show warning message
            var warn = createWarnBar(errMsg);
            warn.prependTo($(this).parent().parent());
        }
    });
    provNew.append(provisionBtn);

    return provNew;
}
/**
 * Remove zprovision loading gif for zhcp and message
 *
 * @param division holding the gif and message
 */
function removeProvisionLoadingGif(provisionStatBar) {

    // Only remove the status bar message and gif we added, then hide the status bar
    var items = provisionStatBar.find('div').children();
    for (var i = 0; i< items.length; i++) {
        var nname = items[i].nodeName;
        var myid = items[i].id;
        if (nname == "B" && myid == "loadzhcp") {
            items[i].remove()
        } else if (nname == "IMG" && myid == "loadingpic") {
            items[i].remove();
        }
    }
    provisionStatBar.hide();
}

/**
 * Set hash entry to 0 and check if all are 0. If so call
 * removeProvisionLoadingGif
 *
 * @param division holding the gif and message, and hash, and
 *                 key
 */
function checkProvisionCallsDone(provisionStatBar, table, finishedKey) {

    table[finishedKey] = 0;

    for (var key in table) {
        if (table[key] == 1) {
            return; // More to do
        }
    }

    removeProvisionLoadingGif(provisionStatBar);
}

/**
 * Load zVMs into column (service page)
 *
 * @param col Table column where OS images will be placed
 */
function loadzVMs(col) {
    // Get group names and description and append to group column
    if (!$.cookie('zvms')) {
        var infoBar = createInfoBar('No selectable z/VM available');
        col.append(infoBar);
        return;
    }

    var zNames = $.cookie('zvms').split(',');

    var radio, zBlock, args, zvm, hcp;
    for (var i in zNames) {
        if( !zNames[i] || 0 === zNames[i].length) continue;
        args = zNames[i].split(':');
        zvm = args[0];
        hcp = args[1];

        // Create block for each group
        zBlock = $('<div class="ui-state-default"></div>').css({
            'border': '1px solid',
            'max-width': '200px',
            'margin': '5px auto',
            'padding': '5px',
            'display': 'block',
            'vertical-align': 'middle',
            'cursor': 'pointer',
            'white-space': 'normal'
        }).click(function(){
            $(this).children('input:radio').attr('checked', 'checked');
            $(this).parents('td').find('div').attr('class', 'ui-state-default');
            $(this).attr('class', 'ui-state-active');
        });
        radio = $('<input type="radio" name="hcp" value="' + hcp + '"/>').css('display', 'none');
        zBlock.append(radio, $('<span style="font-weight: normal;"><b>' + zvm + '</b> managed by ' + hcp + '</span>'));
        zBlock.children('span').css({
            'display': 'block',
            'margin': '5px',
            'text-align': 'left'
        });
        col.append(zBlock);
    }
}

/**
 * Load groups into column
 *
 * @param col Table column where OS images will be placed
 */
function loadSrvGroups(col) {
    // Get group names and description and append to group column
    if (!$.cookie('srv_groups')) {
        var infoBar = createInfoBar('No selectable group available');
        col.append(infoBar);
        return;
    }

    var groupNames = $.cookie('srv_groups').split(',');

    var groupBlock, radio, args, name, ip, hostname, desc;
    for (var i in groupNames) {
        if( !groupNames[i] || 0 === groupNames[i].length) continue;
        args = groupNames[i].split(':');
        name = args[0];
        ip = args[1];
        hostname = args[2];
        desc = args[3];

        // Create block for each group
        groupBlock = $('<div class="ui-state-default"></div>').css({
            'border': '1px solid',
            'max-width': '200px',
            'margin': '5px auto',
            'padding': '5px',
            'display': 'block',
            'vertical-align': 'middle',
            'cursor': 'pointer',
            'white-space': 'normal'
        }).click(function(){
            $(this).children('input:radio').attr('checked', 'checked');
            $(this).parents('td').find('div').attr('class', 'ui-state-default');
            $(this).attr('class', 'ui-state-active');
        });
        radio = $('<input type="radio" name="group" value="' + name + '"/>').css('display', 'none');
        groupBlock.append(radio, $('<span style="font-weight: normal;"><b>' + name + '</b>: ' + desc + '</span>'));
        groupBlock.children('span').css({
            'display': 'block',
            'margin': '5px',
            'text-align': 'left'
        });
        col.append(groupBlock);
    }
}

/**
 * Load OS images into column
 *
 * @param col Table column where OS images will be placed
 */
function loadOSImages(col) {
    // Get group names and description and append to group column
    if (!$.cookie('srv_imagenames')) {
        var infoBar = createInfoBar('No selectable image available');
        col.append(infoBar);
        return;
    }

    var imgNames = $.cookie('srv_imagenames').split(',');

    var imgBlock, radio, args, name, desc;
    for (var i in imgNames) {
        if( !imgNames[i] || 0 === imgNames[i].length) continue;
        args = imgNames[i].split(':');
        name = args[0];
        desc = args[1];

        // Create block for each image
        imgBlock = $('<div class="ui-state-default"></div>').css({
            'border': '1px solid',
            'max-width': '200px',
            'margin': '5px auto',
            'padding': '5px',
            'display': 'block',
            'vertical-align': 'middle',
            'cursor': 'pointer',
            'white-space': 'normal'
        }).click(function(){
            $(this).children('input:radio').attr('checked', 'checked');
            $(this).parents('td').find('div').attr('class', 'ui-state-default');
            $(this).attr('class', 'ui-state-active');

            $('#select-table tbody tr:eq(0) td:eq(3) input[name="master"]').attr('checked', '');
            $('#select-table tbody tr:eq(0) td:eq(3) input[name="master"]').parents('td').find('div').attr('class', 'ui-state-default');
        });
        radio = $('<input type="radio" name="image" value="' + name + '"/>').css('display', 'none');
        imgBlock.append(radio, $('<span style="font-weight: normal;"><b>' + name + '</b>: ' + desc + '</span>'));
        imgBlock.children('span').css({
            'display': 'block',
            'margin': '5px',
            'text-align': 'left'
        });
        col.append(imgBlock);
    }
}

/**
 * Load golden images into column
 *
 * @param col Table column where master copies will be placed
 */
function loadGoldenImages(col) {
    // Get group names and description and append to group column
    if (!$.cookie('srv_goldenimages')) {
        var infoBar = createInfoBar('No selectable master copies available');
        col.append(infoBar);
        return;
    }

    var imgNames = $.cookie('srv_goldenimages').split(',');

    var imgBlock, radio, args, name, desc;
    for (var i in imgNames) {
        if( !imgNames[i] || 0 === imgNames[i].length) continue;
        args = imgNames[i].split(':');
        name = args[0];
        desc = args[1];

        // Create block for each image
        imgBlock = $('<div class="ui-state-default"></div>').css({
            'border': '1px solid',
            'max-width': '200px',
            'margin': '5px auto',
            'padding': '5px',
            'display': 'block',
            'vertical-align': 'middle',
            'cursor': 'pointer',
            'white-space': 'normal'
        }).click(function(){
            $(this).children('input:radio').attr('checked', 'checked');
            $(this).parents('td').find('div').attr('class', 'ui-state-default');
            $(this).attr('class', 'ui-state-active');

            // Un-select zVM and image
            $('#select-table tbody tr:eq(0) td:eq(2) input[name="image"]').attr('checked', '');
            $('#select-table tbody tr:eq(0) td:eq(2) input[name="image"]').parents('td').find('div').attr('class', 'ui-state-default');

            $('#select-table tbody tr:eq(0) td:eq(0) input[name="hcp"]').attr('checked', '');
            $('#select-table tbody tr:eq(0) td:eq(0) input[name="hcp"]').parents('td').find('div').attr('class', 'ui-state-default');
        });
        radio = $('<input type="radio" name="master" value="' + name + '"/>').css('display', 'none');
        imgBlock.append(radio, $('<span style="font-weight: normal;"><b>' + name + '</b>: ' + desc + '</span>'));
        imgBlock.children('span').css({
            'display': 'block',
            'margin': '5px',
            'text-align': 'left'
        });
        col.append(imgBlock);
    }
}

/**
 * Set a cookie for zVM host names (service page)
 *
 * @param data Data from HTTP request
 */
function setzVMCookies(data) {
    if (data.rsp.length && data.rsp[0].indexOf("Failed") == -1) {
        var zvms = new Array();
        var hosts = data.rsp[0].split("\n");
        for ( var i = 0; i < hosts.length; i++) {
            if (hosts[i] != null && hosts[i] != "") {
                zvms.push(hosts[i]);
                if (typeof console == "object"){
                    console.log("Setting a zVM cookie:<"+hosts[i]+">");
                }
            }
        }

        // Set cookie to expire in 60 minutes
        var exDate = new Date();
        exDate.setTime(exDate.getTime() + (60 * 60 * 1000));
        $.cookie('zvms', zvms, { expires: exDate });
    }
}

/**
 * Set a cookie for master copies (service page)
 *
 * @param data Data from HTTP request
 */
function setGoldenImagesCookies(data) {
    if (data.rsp.length && data.rsp[0].indexOf("Failed") == -1) {
        var copies = new Array();
        var tmp = data.rsp[0].split(",");
        for ( var i = 0; i < tmp.length; i++) {
            if (tmp[i] != null && tmp[i] != "") {
                copies.push(tmp[i]);
            }
        }

        // Set cookie to expire in 60 minutes
        var exDate = new Date();
        exDate.setTime(exDate.getTime() + (60 * 60 * 1000));
        $.cookie('srv_goldenimages', copies, { expires: exDate });
    }
}

/**
 * Set a cookie for disk pool names of a given node
 *
 * @param data Data from HTTP request
 */
function setDiskPoolCookies(data) {
    if (data.rsp.length && data.rsp[0].indexOf("Failed") == -1) {
        var node = data.msg;
        var pools = data.rsp[0].split(node + ": ");
        var pools2 = [];
        for (var j in pools) {
            if (pools[j] != "") {
                pools2.push(jQuery.trim(pools[j]));
            }
        }

        // Set cookie to expire in 60 minutes
        var exDate = new Date();
        exDate.setTime(exDate.getTime() + (60 * 60 * 1000));
        $.cookie(node + 'diskpools', pools2, { expires: exDate });
    }
}

/**
 * Set a cookie for zFCP pool names of a given node
 *
 * @param data Data from HTTP request
 */
function setZfcpPoolCookies(data) {
    if (data.rsp.length && data.rsp[0].indexOf("Failed") == -1) {
        var node = data.msg;
        var pools = data.rsp[0].split(node + ': ');
        var pools2 = [];
        for (var j in pools) {
            if (pools[j] != "") {
                pools2.push(jQuery.trim(pools[j]));
            }
        }

        // Set cookie to expire in 60 minutes
        var exDate = new Date();
        exDate.setTime(exDate.getTime() + (60 * 60 * 1000));
        $.cookie(node + 'zfcppools', pools2, { expires: exDate });
    }
}

/**
 * Set a cookie for zHCP host names
 *
 * @param zhcps List of zHCPs known
 */
function setzHcpCookies(zhcps) {
    if (zhcps.length) {
        // Set cookie to expire in 60 minutes
        var exDate = new Date();
        exDate.setTime(exDate.getTime() + (60 * 60 * 1000));
        $.cookie('zhcps', zhcps, { expires: exDate });
    }
}

/**
 * Set a cookie for z/VM user profile names of a given node
 *
 * @param data Data from HTTP request
 */
function setUserProfilesCookies(data) {
    if (data.rsp.length && data.rsp[0].indexOf("Failed") == -1) {
        var node = data.msg;
        var profiles = data.rsp[0].split(node + ': ');
        var profiles2 = [];
        for (var j in profiles) {
            if (profiles[j] != "") {
                profiles2.push(jQuery.trim(profiles[j]));
            }
        }

        // Set cookie to expire in 60 minutes
        var exDate = new Date();
        exDate.setTime(exDate.getTime() + (60 * 60 * 1000));
        $.cookie(node + 'userprofiles', profiles2, { expires: exDate });
    }
}

/**
 * Create virtual machine (service page)
 *
 * @param tabId Tab ID
 * @param group Group
 * @param hcp Hardware control point
 * @param img OS image
 */
function createzVM(tabId, group, hcp, img, owner) {
    // Submit request to create VM
    // webportal provzlinux [group] [hcp] [image] [owner]
    var iframe = createIFrame('lib/srv_cmd.php?cmd=webportal&tgt=&args=provzlinux;' + group + ';' + hcp + ';' + img + ';' + owner + '&msg=&opts=flush');
    iframe.prependTo($('#' + tabId));
}

/**
 * Query the profiles that exists
 *
 * @param panelId Panel ID
 */
function queryProfiles(panelId) {
    $.ajax({
        url : 'lib/cmd.php',
        dataType : 'json',
        data : {
            cmd : 'tabdump',
            tgt : '',
            args : 'osimage',
            msg : panelId
        },

        success : function(data) {
            var panelId = data.msg;
            setOSImageCookies(data);
            configProfilePanel(panelId);
        }
    });
}

/**
 * Panel to configure directory entries and disks for a profile
 *
 * @param panelId Panel ID
 */
function configProfilePanel(panelId) {
    // Wipe panel clean
    $('#' + panelId).empty();

    // Add info bar
    $('#' + panelId).append(createInfoBar('Create, edit, and delete profiles for the self-service portal. It is important to note the default z/VM user ID for any profile should be LXUSR.'));

    // Create table
    var tableId = 'zvmProfileTable';
    var table = new DataTable(tableId);
    table.init(['<input type="checkbox" onclick="selectAllCheckbox(event, $(this))">', 'Profile', 'Disk pool', 'Disk size', 'Directory entry']);

    // Insert profiles into table
    var profiles = $.cookie('profiles').split(',');
    profiles.push('default'); // Add default profile
    for (var i in profiles) {
        if (profiles[i]) {
            // Columns are: profile, selectable, description, disk pool, disk size, and directory entry
            var cols = new Array(profiles[i], '', '', '');

            // Add remove button where id = user name
            cols.unshift('<input type="checkbox" name="' + profiles[i] + '"/>');

            // Add row
            table.add(cols);
        }
    }

    // Append datatable to tab
    $('#' + panelId).append(table.object());

    // Turn into datatable
    $('#' + tableId).dataTable({
        'iDisplayLength': 50,
        'bLengthChange': false,
        "bScrollCollapse": true,
        "sScrollY": "400px",
        "sScrollX": "110%",
        "bAutoWidth": true,
        "oLanguage": {
            "oPaginate": {
              "sNext": "",
              "sPrevious": ""
            }
        }
    });

    // Create action bar
    var actionBar = $('<div class="actionBar"></div>').css("width", "450px");

    // Create a profile
    var createLnk = $('<a>Create</a>');
    createLnk.click(function() {
        profileDialog();
    });

    // Edit a profile
    var editLnk = $('<a>Edit</a>');
    editLnk.click(function() {
        var profiles = $('#' + tableId + ' input[type=checkbox]:checked');
        for (var i in profiles) {
            var profile = profiles.eq(i).attr('name');
            if (profile) {
                // Column order is: profile, selectable, disk pool, disk size, and directory entry
                var cols = profiles.eq(i).parents('tr').find('td');
                var pool = cols.eq(2).text();
                var size = cols.eq(3).text();
                var entry = cols.eq(4).html().replace(new RegExp('<br>', 'g'), '\n');

                editProfileDialog(profile, pool, size, entry);
            }
        }
    });

    // Delete a profile
    var deleteLnk = $('<a>Delete</a>');
    deleteLnk.click(function() {
        var profiles = getNodesChecked(tableId);
        if (profiles) {
            deleteProfileDialog(profiles);
        }
    });

    // Refresh profiles table
    var refreshLnk = $('<a>Refresh</a>');
    refreshLnk.click(function() {
        queryProfiles(panelId);
    });

    // Create an action menu
    var actionsMenu = createMenu([refreshLnk, createLnk, editLnk, deleteLnk]);
    actionsMenu.superfish();
    actionsMenu.css('display', 'inline-block');
    actionBar.append(actionsMenu);

    // Set correct theme for action menu
    actionsMenu.find('li').hover(function() {
        setMenu2Theme($(this));
    }, function() {
        setMenu2Normal($(this));
    });

    // Create a division to hold actions menu
    var menuDiv = $('<div id="' + tableId + '_menuDiv" class="menuDiv"></div>');
    $('#' + tableId + '_wrapper').prepend(menuDiv);
    menuDiv.append(actionBar);
    $('#' + tableId + '_filter').appendTo(menuDiv);

    // Resize accordion
    $('#' + tableId).parents('.ui-accordion').accordion('resize');

    // Query directory entries and disk pool/size for each profile
    for (var i in profiles) {
        $.ajax({
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'webrun',
                tgt : '',
                args : 'getdefaultuserentry;' + profiles[i],
                msg : 'out=' + panelId + ';profile=' + profiles[i]
            },

            success: insertDirectoryEntry
        });

        $.ajax({
            url : 'lib/cmd.php',
            dataType : 'json',
            data : {
                cmd : 'webrun',
                tgt : '',
                args : 'getzdiskinfo;' + profiles[i],
                msg : 'out=' + panelId + ';profile=' + profiles[i]
            },

            success: insertDiskInfo
        });
    }
}

/**
 * Insert the directory entry into the profile table
 *
 * @param data Data from HTTP request
 */
function insertDirectoryEntry(data) {
    var tableId = 'zvmProfileTable';
    var args = data.msg.split(';');

    var profile = args[1].replace('profile=', '');

    // Do not continue if there is nothing
    if (!data.rsp.length)
        return;

    var entry = data.rsp[0].replace(new RegExp('\n', 'g'), '<br/>');

    // Get the row containing the profile
    var rowPos = findRow(profile, '#' + tableId, 1);
    if (rowPos < 0)
        return;

    // Update the directory entry column
    var dTable = $('#' + tableId).dataTable();
    dTable.fnUpdate(entry, rowPos, 4, false);

    // Adjust table styling
    $('#' + tableId + ' td:nth-child(5)').css({
        'text-align': 'left'
    });
    adjustColumnSize(tableId);
}

/**
 * Insert the disk info into the profile table
 *
 * @param data Data from HTTP request
 */
function insertDiskInfo(data) {
    var tableId = 'zvmProfileTable';
    var args = data.msg.split(';');

    var profile = args[1].replace('profile=', '');

    // Do not continue if there is nothing
    if (!data.rsp.length)
        return;

    // Get the row containing the profile
    var rowPos = findRow(profile, '#' + tableId, 1);
    if (rowPos < 0)
        return;

    // Update the disk info columns
    var dTable = $('#' + tableId).dataTable();

    var tmp = "";
    var pool = "";
    var eckdSize = 0;
    var info = data.rsp[0].split('\n');
    for (var i in info) {
        if (info[i].indexOf('diskpool') > -1) {
            tmp = info[i].split('=');
            pool = jQuery.trim(tmp[1]);

            dTable.fnUpdate(pool, rowPos, 2, false);
        } if (info[i].indexOf('eckd_size') > -1) {
            tmp = info[i].split('=');
            eckdSize = jQuery.trim(tmp[1]);

            dTable.fnUpdate(eckdSize, rowPos, 3, false);
        }
    }

    // Adjust table styling
    adjustColumnSize(tableId);
}

/**
 * Open profile dialog
 */
function profileDialog() {
    // Create form to add profile
    var dialogId = 'zvmCreateProfile';
    var profileForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Create info bar
    var info = createInfoBar('Configure the default settings for a profile');
    profileForm.append(info);

    // Insert profiles into select
    var profileSelect = $('<select name="profile" title="The image profile to set defaults for"></select>');
    var profiles = $.cookie('profiles').split(',');
    profiles.push('default'); // Add default profile
    for (var i in profiles) {
        if (profiles[i]) {
            profileSelect.append($('<option>' + profiles[i] + '</option>'));
        }
    }

    profileForm.append($('<div><label>Profile:</label></div>').append(profileSelect));
    profileForm.append('<div><label>Disk pool:</label><input type="text" name="disk_pool" title="The disk pool where xCAT will obtain disk(s) from for node installations"/></div>');
    profileForm.append('<div><label>Disk size (ECKD):</label><input type="text" name="disk_size_eckd" title="The default size of the disk, which can be given as G, M, or number of cylinders."/></div>');
    profileForm.append('<div><label style="vertical-align: top;">Directory entry:</label><textarea name="directory_entry" title="The default directory entry for a node. The default user ID must be set to LXUSR."/></div>');

    // Generate tooltips
    profileForm.find('div input[title],textarea[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "fade",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add processor
    profileForm.dialog({
        title:'Configure profile',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 600,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                // Find profile attributes
                var profile = $(this).find('select[name=profile]').val();
                var pool = $(this).find('input[name=disk_pool]').val();
                var size = $(this).find('input[name=disk_size_eckd]').val();
                var entry = $(this).find('textarea[name=directory_entry]').val();

                // If inputs are not complete, show warning message
                if (!profile || !pool || !size || !entry) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Change dialog buttons
                    $('#' + dialogId).dialog('option', 'buttons', {
                        'Close':function(){
                            $(this).dialog('destroy').remove();
                        }
                    });

                    // Write file to /var/tmp
                    $.ajax({
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'write',
                            tgt : '/var/tmp/' + profile + '.direct',
                            args : '',
                            cont : entry,
                            msg : dialogId + ';' + profile + ';' + pool + ';' + size
                        },

                        success : function(data) {
                            var args = data.msg.split(';');

                            // Create profile in xCAT
                            $.ajax({
                                url : 'lib/cmd.php',
                                dataType : 'json',
                                data : {
                                    cmd : 'webrun',
                                    tgt : '',
                                    args : 'mkzprofile;' + args[1] + ';' + args[2] + ';' + args[3],
                                    msg : args[0]
                                },

                                success: updatePanel
                            });
                        }
                    });
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to confirm profile delete
 *
 * @param profiles Profiles to delete
 */
function deleteProfileDialog(profiles) {
    // Create form to delete disk to pool
    var dialogId = 'zvmDeleteProfile';
    var deleteForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Create info bar
    var info = createInfoBar('Are you sure you want to delete ' + profiles.replace(new RegExp(',', 'g'), ', ') + '?');
    deleteForm.append(info);

    // Open dialog to delete user
    deleteForm.dialog({
        title:'Delete profile',
        modal: true,
        width: 400,
        close: function(){
            $(this).remove();
        },
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                // Change dialog buttons
                $(this).dialog('option', 'buttons', {
                    'Close': function() {$(this).dialog("close");}
                });

                // Delete user
                $.ajax( {
                    url : 'lib/cmd.php',
                    dataType : 'json',
                    data : {
                        cmd : 'webrun',
                        tgt : '',
                        args : 'rmzprofile;' + profiles,
                        msg : dialogId
                    },
                    success : updatePanel
                });
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Open dialog to edit profile
 *
 * @param profile Profile to edit
 * @param pool Disk pool
 * @param size Disk size
 * @param entry Directory entry
 */
function editProfileDialog(profile, pool, size, entry) {
    // Create form to add profile
    var dialogId = 'zvmEditProfile_' + profile;
    var profileForm = $('<div id="' + dialogId + '" class="form"></div>');

    // Create info bar
    var info = createInfoBar('Configure the default settings for a profile');
    profileForm.append(info);

    // Insert profiles into select
    var profileSelect = $('<select name="profile" title="The image profile to set defaults for"></select>');
    var profiles = $.cookie('profiles').split(',');
    profiles.push('default'); // Add default profile
    for (var i in profiles) {
        if (profiles[i]) {
            profileSelect.append($('<option value="' + profiles[i] + '">' + profiles[i] + '</option>'));
        }
    }

    profileForm.append($('<div><label>Profile:</label></div>').append(profileSelect));
    profileForm.append('<div><label>Disk pool:</label><input type="text" name="disk_pool" title="The disk pool where xCAT will obtain disk(s) from for node installations"/></div>');
    profileForm.append('<div><label>Disk size (ECKD):</label><input type="text" name="disk_size_eckd" title="The default size of the disk, which can be given as G, M, or number of cylinders."/></div>');
    profileForm.append('<div><label style="vertical-align: top;">Directory entry:</label><textarea name="directory_entry" title="The default directory entry for a node. The default user ID must be set to LXUSR."/></div>');

    // Insert profile values
    profileSelect.val(profile);
    profileForm.find('input[name=disk_pool]').val(pool);
    profileForm.find('input[name=disk_size_eckd]').val(size);
    profileForm.find('textarea[name=directory_entry]').val(entry);

    // Generate tooltips
    profileForm.find('div input[title],textarea[title],select[title]').tooltip({
        position: "center right",
        offset: [-2, 10],
        effect: "toggle",
        opacity: 0.8,
        delay: 0,
        predelay: 800,
        events: {
              def:     "mouseover,mouseout",
              input:   "mouseover,mouseout",
              widget:  "focus mouseover,blur mouseout",
              tooltip: "mouseover,mouseout"
        },

        // Change z index to show tooltip in front
        onBeforeShow: function() {
            this.getTip().css('z-index', $.topZIndex());
        }
    });

    // Open dialog to add processor
    profileForm.dialog({
        title:'Configure profile',
        modal: true,
        close: function(){
            $(this).remove();
        },
        width: 600,
        buttons: {
            "Ok": function(){
                // Remove any warning messages
                $(this).find('.ui-state-error').remove();

                // Find profile attributes
                var profile = $(this).find('select[name=profile]').val();
                var pool = $(this).find('input[name=disk_pool]').val();
                var size = $(this).find('input[name=disk_size_eckd]').val();
                var entry = $(this).find('textarea[name=directory_entry]').val();

                // If inputs are not complete, show warning message
                if (!profile || !pool || !size || !entry) {
                    var warn = createWarnBar('Please provide a value for each missing field.');
                    warn.prependTo($(this));
                } else {
                    // Change dialog buttons
                    $('#' + dialogId).dialog('option', 'buttons', {
                        'Close':function(){
                            $(this).dialog('destroy').remove();
                        }
                    });

                    // A newline at the end of directory entry is needed
                    entry = entry.replace(/^\s+|\s+$/g, '');
                    entry += '\n';

                    // Write file to /var/tmp
                    $.ajax({
                        url : 'lib/cmd.php',
                        dataType : 'json',
                        data : {
                            cmd : 'write',
                            tgt : '/var/tmp/' + profile + '.direct',
                            args : '',
                            cont : entry,
                            msg : dialogId + ';' + profile + ';' + pool + ';' + size
                        },

                        success : function(data) {
                            var args = data.msg.split(';');

                            // Create profile in xCAT
                            $.ajax({
                                url : 'lib/cmd.php',
                                dataType : 'json',
                                data : {
                                    cmd : 'webrun',
                                    tgt : '',
                                    args : 'mkzprofile;' + args[1] + ';' + args[2] + ';' + args[3],
                                    msg : args[0]
                                },

                                success: updatePanel
                            });
                        }
                    });
                }
            },
            "Cancel": function() {
                $(this).dialog( "close" );
            }
        }
    });
}

/**
 * Get a hash map containing the zHCP to z/VM system mapping
 *
 * @returns Hash map containing the zHCP to z/VM system mapping
 */
function getHcpZvmHash() {
    // Get zVM host names
    if (!$.cookie('zvms')) {
        $.ajax({
            url : 'lib/cmd.php',
            dataType : 'json',
            async: false,
            data : {
                cmd : 'webportal',
                tgt : '',
                args : 'lszvm',
                msg : ''
            },

            success : function(data) {
                setzVMCookies(data);
            }
        });
    }

    var zvms = $.cookie('zvms').split(',');
    var hcp2zvm = new Object();
    var args, zvm, iHcp, tmp;
    for (var i in zvms) {
        if( !zvms[i] || 0 === zvms[i].length) continue;
        args = zvms[i].split(':');
        zvm = args[0].toLowerCase();

        if (args[1].indexOf('.') != -1) {
            tmp = args[1].split('.');
            iHcp = tmp[0];
        } else {
            iHcp = args[1];
        }

        hcp2zvm[iHcp] = zvm;
    }

    return hcp2zvm;
}

/**
 * Update the user entry text area on a given tab
 *
 * @param tabId Tab Id where user entry text area is contained
 */
function updateUserEntry(tabId) {
    var userId = $('#' + tabId + ' input[name=userId]').val().toUpperCase();
    var profile = $('#' + tabId + ' select[name=userProfile]').val();
    var cpuCount = parseInt($('#' + tabId + ' select[name=cpuCount]').val());
    var memory = $('#' + tabId + ' input[name=memory]').val();
    var network = $('#' + tabId + ' select[name=network]').val();
    var networktext = $('#' + tabId + ' select[name=network]').find('option:selected').text();
    networktext = jQuery.trim(networktext);
    var hcp = $('#' + tabId + ' input[name=hcp]').val();
    var hcpNode = $('#' + tabId + ' input[name=hcpNode]').val();
    var hashtable = getselectedNetworkHash();
    if (typeof console == "object"){
      console.log("Entering updateUserEntry for tab id:"+tabId);
    }

    if (!hashtable) {
        hashtable = [[]];
        setselectedNetworkHash(hashtable);

        if (typeof console == "object") {
            console.log("updateUserEntry. creating new hash[[]] table!!");
        }
    }

    if (networktext.indexOf('VSWITCH') > -1) {
        var nettokens = networktext.split(' '); // Get tokens for vswitch, system, name
        var hashid = tabId + '_' + nettokens[2];
        var requestStarted = 0;

        // Did we already get the network details?
        if (typeof hashtable[hashid] === 'undefined') {
            if (typeof console == "object") {
                console.log("updateUserEntry. calling getNetworkDetails since no hashid defined:" + hashid);
            }
            requestStarted = 1;
            getNetworkDetails(hcpNode, nettokens[2], hashid, tabId);
        } else if (typeof hashtable[hashid]['vlan_awareness'] === 'undefined') { // May not hit this condition
            if (typeof console == "object") {
                console.log("updateUserEntry. calling getNetworkDetails since no vlan_awareness was found in hashid:" + hashid);
            }
            requestStarted = 1;
            getNetworkDetails(hcpNode, nettokens[2], hashid, tabId);
        }

        // If a request is started, then do the ajax stop path
        if (requestStarted == 1) {
            // Make sure that the request to get network details is finished before
            // calling generateUserEntry
            $(document).ajaxStop(function() {
                if (typeof console == "object") {
                    console.log("updateUserEntry. In ajaxstop");
                }
                requestStarted = 0;
                var privilege = [];
                $('#' + tabId + ' input[name=privilege]:checked').each(function () {
                    privilege.push($(this).val());
                });
                privilege = privilege.join('');

                // Find device to be IPL
                var diskRows = $('#' + tabId + ' table:eq(0):visible tbody tr');
                var ipl;
                for (var i = 0; i < diskRows.length; i++) {
                    var diskArgs = diskRows.eq(i).find('td');
                    var address = diskArgs.eq(2).find('input').val();
                    if (diskArgs.eq(7).find('input').attr("checked") === true) {
                        ipl = address;
                        break;
                    }
                }

                // Only update directory entry if the basic tab is selected
                var inst = tabId.replace('zvmProvisionTab', '');
                var hwTabIndex = $("#hwConfig" + inst).tabs('option', 'selected');
                var showvlan = $('#' + tabId).find('#vlandiv'); // Vlan information only for basic tab if vswitch is vlan aware

                if (hwTabIndex == 0) {
                    if ((typeof hashtable[hashid] !== 'undefined') &&
                        (hashtable[hashid]["vlan_awareness"] == "AWARE")) {
                        if (typeof console == "object"){
                          console.log("VLAN AWARE hashid:"+hashid);
                        }
                        showvlan.find('input[name=vswitchvlanid]').val(hashtable[hashid]["vlan_id"]);
                        showvlan.find('select[name=vswitchporttype]').val(hashtable[hashid]["port_type"]);
                        showvlan.show();
                    } else {
                        showvlan.find('input[name=vswitchvlanid]').val("default");
                        showvlan.find('select[name=vswitchporttype]').val("default");
                        showvlan.hide();
                    }
                    var userDirectoryEntry = generateUserEntry(userId, "XCAT", memory, privilege, profile, cpuCount, network, ipl, hcp, networktext, tabId, hashid);
                    $('#' + tabId + ' textarea').val(userDirectoryEntry);
                }
            });

        } else {
            var privilege = [];
            $('#' + tabId + ' input[name=privilege]:checked').each(function () {
                privilege.push($(this).val());
            });
            privilege = privilege.join('');

            // Find device to be IPL
            var diskRows = $('#' + tabId + ' table:eq(0):visible tbody tr');
            var ipl;
            for (var i = 0; i < diskRows.length; i++) {
                var diskArgs = diskRows.eq(i).find('td');
                var address = diskArgs.eq(2).find('input').val();
                if (diskArgs.eq(7).find('input').attr("checked") === true) {
                    ipl = address;
                    break;
                }
            }

            // Only update directory entry if the basic tab is selected
            var inst = tabId.replace('zvmProvisionTab', '');
            var hwTabIndex = $("#hwConfig" + inst).tabs('option', 'selected');
            var showvlan = $('#' + tabId).find('#vlandiv'); // Vlan information only for basic tab if vswitch is vlan aware

            if (hwTabIndex == 0) {
                if (hashtable[hashid]["vlan_awareness"] == "AWARE") {
                    if (typeof console == "object"){
                      console.log("VLAN AWARE hashid:"+hashid);
                    }
                    showvlan.find('input[name=vswitchvlanid]').val(hashtable[hashid]["vlan_id"]);
                    showvlan.find('select[name=vswitchporttype]').val(hashtable[hashid]["port_type"]);
                    showvlan.show();
                } else {
                    showvlan.find('input[name=vswitchvlanid]').val("default");
                    showvlan.find('select[name=vswitchporttype]').val("default");
                    showvlan.hide();
                }
                var userDirectoryEntry = generateUserEntry(userId, "XCAT", memory, privilege, profile, cpuCount, network, ipl, hcp, networktext, tabId, hashid);
                $('#' + tabId + ' textarea').val(userDirectoryEntry);
            }
        }

    } else {
        var hashid = '';
        var privilege = [];
        $('#' + tabId + ' input[name=privilege]:checked').each(function () {
            privilege.push($(this).val());
        });
        privilege = privilege.join('');

        // Find device to be IPL
        var diskRows = $('#' + tabId + ' table:eq(0):visible tbody tr');
        var ipl;
        for (var i = 0; i < diskRows.length; i++) {
            var diskArgs = diskRows.eq(i).find('td');
            var address = diskArgs.eq(2).find('input').val();
            if (diskArgs.eq(7).find('input').attr("checked") === true) {
                ipl = address;
                break;
            }
        }

        // Only update directory entry if the basic tab is selected
        var inst = tabId.replace('zvmProvisionTab', '');
        var hwTabIndex = $("#hwConfig" + inst).tabs('option', 'selected');
        if (hwTabIndex == 0) {
            var userDirectoryEntry = generateUserEntry(userId, "XCAT", memory, privilege, profile, cpuCount, network, ipl, hcp, networktext, tabId, hashid);
            $('#' + tabId + ' textarea').val(userDirectoryEntry);
        }
    }

}

/**
 * Generate a user directory entry
 *
 * @param userId User Id
 * @param password User password
 * @param memory Memory to assign to virtual machine
 * @param privilege User privilege class
 * @param profile User profile
 * @param cpuCount Number of CPU to assign to virtual machine
 * @param network Network interface used by virtual machine
 * @param ipl The device to be IPL
 * @param hcp The hcp for this user
 * @param networktext string containing network info
 * @param tabId The current tab identifier
 * @param hashid If a vswitch, then the hash index, else empty
 *               string
 *
 * @returns User directory entry
 */
function generateUserEntry(userId, password, memory, privilege, profile, cpuCount, network, ipl, hcp, networktext, tabId, hashid) {
    var userDirectoryEntry = "USER " + userId + " XCAT " + memory + " " + memory + " " + privilege + "\n";
    var hashtable = getselectedNetworkHash();

    // Include user profile if there is one
    if (profile) {
        userDirectoryEntry += "INCLUDE " + profile + "\n";
    }

    // Only up to 8 CPU can be assigned
    for (var i = 0; i < cpuCount; i++) {
        userDirectoryEntry += "CPU 0" + i + "\n";
    }

    // Set device IPL
    if (ipl) {
        userDirectoryEntry += "IPL " + ipl + "\n";
    }

    if (typeof console == "object"){
        console.log("Entering generateUserEntry. userid "+userId +" network: " + network + " tabid "+tabId);
    }

    userDirectoryEntry += "MACHINE ESA\n";  // Simulate s390 architecture

    // Include network vswitch grant command if given, must be before NICDEF (or other devices)
    if (network.length > 0) {
        // Check for VSWITCH and vlan value
        if (networktext.indexOf('VSWITCH') > -1) {
            var tokens = networktext.split(' ');
            var dirmcmd = "COMMAND SET VSWITCH "+tokens[2]+ " GRANT "+ userId;
            if ((typeof hashtable[hashid] !== 'undefined') &&
                ("vlan_awareness" in hashtable[hashid])) {
                var vlanaware = hashtable[hashid]["vlan_awareness"];
                if (vlanaware == 'AWARE') {

                    // Did they pick a port type and vlanid?
                    var uiport = $('#' + tabId + ' select[name=vswitchporttype]').val();
                    var uilanid = $('#' + tabId + ' input[name=vswitchvlanid]').val();

                    if (uiport.length > 0 && uiport != "default") {
                        dirmcmd += " PORTTYPE " + uiport;
                    }
                    if (uilanid.length > 0 && uilanid != "default") {
                        dirmcmd += " VLAN " + uilanid;
                    }
                }
            } else {
                if (typeof console == "object"){
                    console.log("**** NO VSWITCH info found in hash or the hashtable with key "+hashid + " is undefined.");
                }
            }
            userDirectoryEntry += dirmcmd +"\n";
        }
    }
    userDirectoryEntry += "CONSOLE 0009 3215 T\n";
    if (network.length > 0) {
        userDirectoryEntry += "NICDEF 0A00 " + network + "\n";
    }

    userDirectoryEntry += "SPOOL 000C 2540 READER *\n";
    userDirectoryEntry += "SPOOL 000D 2540 PUNCH A\n";
    userDirectoryEntry += "SPOOL 000E 1403 A\n";

    return userDirectoryEntry;
}

/**
 * Convert a string (e.g. 1024M) into GB
 *
 * @param size The string containing the size
 * @return Size in GB
 */
function convertString2Gb(size) {
    var sizeGb = 0;
    if (size.indexOf('G') != -1) {
        sizeGb = parseInt(size);
    } else if (size.indexOf('M') != -1) {
        sizeGb = parseInt(size)*1024;
    }

    return sizeGb;
}

/**
 * Convert a given number of cylinders into GB
 *
 * @param cylinders Number of cylinders
 * @return Size in GB
 */
function convertCylinders2Gb(cylinders) {
    var bytes = cylinders * 737280;
    var sizeGb = bytes/(1024*1024*1024);
    sizeGb = Math.round(sizeGb * 10)/10;  // Round to 1 decimal place

    return sizeGb;
}

/**
 * Convert a given number of blocks into GB
 *
 * @param blocks Number of blocks
 * @return Size in GB
 */
function convertBlocks2Gb(blocks) {
    var sizeGb = blocks/(2048*1024);
    sizeGb = Math.round(sizeGb * 10)/10;  // Round to 1 decimal place

    return sizeGb;
}

/**
 * Get the network Vswitch details in a hash table
 *
 * @param hcp The hardware ccontrol point for this vswitch
 * @param vswitch name from "VSWITCH SYSTEM  switchname"
 * @param hash id key
 * @parma table id or ''
 *
 * @returns nothing (sets global variable
 *        selectedNetworkHash[tabId]
 */
function getNetworkDetails(hcpNode, vswitchname, hashId, tabId) {
    if (typeof console == "object") {
        console.log("Entering getNetworkDetails. HashId:" + hashId + " tabId<" + tabId + ">");
    }

    // Get network details
    $.ajax( {
        url: 'lib/cmd.php',
        dataType: 'json',
        data: {
            cmd: 'lsvm',
            tgt: hcpNode,
            args: '--getnetwork;' + vswitchname + ';VSWITCH',
            msg: 'hcp=' + hcpNode + ';type=VSWITCH' + ';network=' + vswitchname + ';hashindex=' + hashId
        },

        success: function(data) {

            var vlanid =  "";
            var vlanaware = "";
            var args = data.msg.split(';');
            var hcp = args[0].replace('hcp=', '');
            var type = args[1].replace('type=', '');
            var name = jQuery.trim(args[2].replace('network=', ''));
            var hashindex = jQuery.trim(args[3].replace('hashindex=', ''));
            var hashtable = getselectedNetworkHash();
            var foundInvalid = 0;
            // The SMAPI code can return "Invalid" for spg_scope so we need to skip this condition
            if (data.rsp.length && (data.rsp[0].indexOf("Invalid") > -1) ) {
                foundInvalid = 1;
                if (data.rsp[0].indexOf("spg_scope: Invalid"> -1) ) {
                    foundInvalid = 0;
                }
            }
            if (!hashtable) {
                hashtable = [[]];
                setselectedNetworkHash(hashtable);

                if (typeof console == "object") {
                    console.log("getNetworkDetails. creating new hash[[]] table!!" + "hashindex<" + hashindex + ">" );
                }
            }
            if (data.rsp.length && (data.rsp[0].indexOf("Failed") > -1 || (foundInvalid == 1) ) ) {
                if (typeof console == "object") {
                              console.log("getNetworkDetails. failure getting the network data for " + hcpNode + " network "+ vswitchname);
                }
                // Create warning dialog
                var warning = createWarnBar('Failure getting network data for hardware control point ' + hcpNode + '<br>The hcp field must be a xCAT node name.');
                var warnDialog = $('<div></div>').append(warning);

                // highlight the hcp field
                if (tabId.length >0) {
                    $('#' + tabId).find('input[name=hcpNode]').css('border', 'solid #FF0000 1px');
                }

                // Open warning dialog
                warnDialog.dialog({
                    title:'Warning',
                    modal: true,
                    close: function(){
                        $(this).remove();
                    },
                    width: 400,
                    buttons: {
                        "Ok": function() {
                            $(this).dialog("close");
                }
                    }
                });
            }
            var tmp = data.rsp[0].split(hcp + ': ');
            for (var i = 1; i < tmp.length; i++) {
                var dataline = tmp[i];
                var keyval;
                if (dataline.indexOf(':') > -1) {
                    keyval = dataline.split(':');
                } else {
                    keyval = dataline.split(' ');
                }
                keyval[0] = jQuery.trim(keyval[0]);
                keyval[1] = jQuery.trim(keyval[1]);
                if (typeof hashtable[hashindex] === 'undefined') {
                    hashtable[hashindex] = [];
                }

                hashtable[hashindex][keyval[0]] = keyval[1];
            }
        }
    });
    return;
}


/**
 * Set a cookie for the zhcp node name for a specific node
 *
 * @param data Data from HTTP request
 */
function setNodeZhcpNodename(data) {
    if (data.rsp.length  && data.rsp[0].indexOf("Failed") == -1) {
        var savedTokens = data.msg.split(';');
        var node = savedTokens[0];
        var hcphostname = savedTokens[1];
        var nodename;
        var hostname;

        for (var i in data.rsp) {
            nodename = data.rsp[i][0];
            hostname = data.rsp[i][1];
            if (hostname == hcphostname) {
                if (typeof console == "object"){
                  console.log("SetNodeZhcpNodename cookie set for node "+node+" using zhcp nodename "+nodename);
                }
                // Set cookie to expire in 60 minutes
                var exDate = new Date();
                exDate.setTime(exDate.getTime() + (60 * 60 * 1000));
                $.cookie(node+'_hcpnodename', nodename, { expires: exDate });
            }
        }
    }
}
