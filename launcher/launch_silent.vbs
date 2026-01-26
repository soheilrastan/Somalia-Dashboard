' ======================================================================
' Geo-Insights Laboratory - Silent Launcher
' ======================================================================
' This script runs start_dashboard.bat completely hidden (no windows)
' The batch file handles everything: cleanup, servers, browser launch
' ======================================================================

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Run the batch file completely hidden (0 = hidden window)
' False = don't wait for completion (let it run in background)
objShell.Run """" & strScriptPath & "\start_dashboard.bat""", 0, False
