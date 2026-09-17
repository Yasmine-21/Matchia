$ErrorActionPreference = "Stop"

$sourcePath = (Get-ChildItem -LiteralPath "D:\PFE M2\Platforme SaaS\deliverables" -Filter "Master Report - diagrammes use case Draw.io *.docx" | Select-Object -First 1).FullName
$outputDirectory = "D:\PFE M2\Platforme SaaS\document_work\rendered_usecases_report"
$pdfPath = Join-Path $outputDirectory "Master_Report_Drawio_QA.pdf"
$logPath = Join-Path $outputDirectory "word_export_debug.log"

if ([string]::IsNullOrWhiteSpace($sourcePath)) {
    throw "Le rapport regenere est introuvable."
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$null = Set-Content -LiteralPath $logPath -Value "start"
Add-Content -LiteralPath $logPath -Value "source=$sourcePath"
$wordExisting = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Word.Application")
Add-Content -LiteralPath $logPath -Value "got-active-word"

try {
    $documentQa = $wordExisting.Documents.Open($sourcePath, $false, $true, $false)
    Add-Content -LiteralPath $logPath -Value "opened-document"
    $documentQa.ExportAsFixedFormat($pdfPath, 17)
    Add-Content -LiteralPath $logPath -Value "exported-pdf"
    Write-Output "PDF=$pdfPath"
    Write-Output "PAGES=$($documentQa.ComputeStatistics(2))"
}
catch {
    Add-Content -LiteralPath $logPath -Value ("ERROR=" + $_.Exception.ToString())
    throw
}
finally {
    if ($null -ne $documentQa) {
        $documentQa.Close($false)
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($documentQa) | Out-Null
    }
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordExisting) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
    Add-Content -LiteralPath $logPath -Value "finished"
}
