<?php

namespace App\Enums;

enum AdminRoleChangeResult
{
    case Updated;
    case Unchanged;
    case LastAdministrator;
    case LastActiveAdministrator;
}
