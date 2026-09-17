$ErrorActionPreference = "Stop"

$sourcePath = (Get-ChildItem -LiteralPath "D:\PFE M2\Platforme SaaS\deliverables" -Filter "Master Report - diagrammes use case Draw.io *.docx" | Select-Object -First 1).FullName
$outputDirectory = "D:\PFE M2\Platforme SaaS\document_work\rendered_usecases_report"
$pdfPath = Join-Path $outputDirectory "Master_Report_Drawio_QA.pdf"

if ([string]::IsNullOrWhiteSpace($sourcePath)) {
    throw "Le rapport regenere est introuvable."
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$wordQa = New-Object -ComObject Word.Application
$wordQa.Visible = $false
$wordQa.DisplayAlerts = 0
$wordQa.Options.SaveNormalPrompt = $false

try {
    $documentQa = $wordQa.Documents.Open($sourcePath, $false, $true, $false)
    $documentQa.ExportAsFixedFormat($pdfPath, 17)
    Write-Output "PDF=$pdfPath"
    Write-Output "PAGES=$($documentQa.ComputeStatistics(2))"
}
finally {
    if ($null -ne $documentQa) {
        $documentQa.Close($false)
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($documentQa) | Out-Null
    }
    $wordQa.Quit()
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordQa) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
