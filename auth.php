<?php
    session_start();
    if (!isset($_SESSION['login'])) {
        header("location:./?msg=errlogin");
    }