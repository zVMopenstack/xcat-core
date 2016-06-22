<?php
/**
 * Monitor page
 */
require_once "lib/functions.php";
require_once "lib/ui.php";

/* Load page */
loadPage();

/* Login user */
if (!isAuthenticated()) {
    login();
} else {
    loadContent();
}
?>