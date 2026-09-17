$ErrorActionPreference = 'Stop'

$wordExecutable = 'C:\Program Files (x86)\Microsoft Office\Office15\WINWORD.EXE'
$inputDocument = 'D:\PFE M2\Platforme SaaS\deliverables\Master Report - diagrammes UML complets corriges.docx'
$outputDirectory = 'D:\PFE M2\Platforme SaaS\document_work\qa_master_report_complete_corrected'
$outputPdf = Join-Path $outputDirectory 'Master Report - diagrammes UML complets corriges.pdf'

Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class WordNativeObject {
    private delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);
    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern int GetClassName(IntPtr hwnd, StringBuilder className, int maxCount);

    [DllImport("oleacc.dll")]
    public static extern int AccessibleObjectFromWindow(
        IntPtr hwnd,
        uint dwObjectID,
        ref Guid riid,
        [MarshalAs(UnmanagedType.Interface)] out object ppvObject
    );

    public static IntPtr FindWordWindow(int processId) {
        IntPtr found = IntPtr.Zero;
        EnumWindows(delegate(IntPtr hwnd, IntPtr lParam) {
            uint pid;
            GetWindowThreadProcessId(hwnd, out pid);
            if (pid == (uint)processId) {
                StringBuilder className = new StringBuilder(256);
                GetClassName(hwnd, className, className.Capacity);
                if (className.ToString() == "OpusApp") {
                    found = hwnd;
                    return false;
                }
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }
}
'@

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$process = Start-Process -FilePath $wordExecutable -ArgumentList '/x','/a','/q','/n' -WindowStyle Hidden -PassThru
$nativeObject = $null
$application = $null
$document = $null

try {
    $handle = [IntPtr]::Zero
    for ($attempt = 0; $attempt -lt 100; $attempt++) {
        Start-Sleep -Milliseconds 150
        $process.Refresh()
        if ($process.HasExited) {
            throw 'L’instance Word isolée s’est arrêtée avant l’initialisation.'
        }
        $handle = [WordNativeObject]::FindWordWindow($process.Id)
        if ($handle -ne [IntPtr]::Zero) {
            break
        }
    }
    if ($handle -eq [IntPtr]::Zero) {
        throw 'La fenêtre d’automatisation Word n’a pas pu être initialisée.'
    }

    $iidDispatch = [Guid]'00020400-0000-0000-C000-000000000046'
    $objidNativeOm = [uint32]4294967280
    $result = -1
    for ($attempt = 0; $attempt -lt 80; $attempt++) {
        $nativeObject = $null
        $result = [WordNativeObject]::AccessibleObjectFromWindow(
            $handle,
            $objidNativeOm,
            [ref]$iidDispatch,
            [ref]$nativeObject
        )
        if ($result -eq 0 -and $nativeObject -ne $null) {
            break
        }
        Start-Sleep -Milliseconds 200
    }
    if ($result -ne 0 -or $nativeObject -eq $null) {
        throw "Impossible d’accéder au modèle objet Word isolé. Code : $result"
    }

    $application = $nativeObject.Application
    $application.DisplayAlerts = 0
    $application.ScreenUpdating = $false
    $application.Options.UpdateLinksAtOpen = $false
    $application.Options.SaveNormalPrompt = $false
    $document = $application.Documents.Open($inputDocument, $false, $true)
    $document.ExportAsFixedFormat($outputPdf, 17)
    Write-Output $outputPdf
}
finally {
    if ($document -ne $null) {
        $document.Close($false)
    }
    if ($application -ne $null) {
        $application.Quit()
    }
    if (!$process.HasExited) {
        $process.Kill()
        $process.WaitForExit(5000) | Out-Null
    }
}
