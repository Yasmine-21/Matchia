$ErrorActionPreference = "Stop"
$sourcePath = "D:\PFE M2\Platforme SaaS\document_work\rendered_usecases_report\report_usecase_excerpt.docx"
$pdfPath = "D:\PFE M2\Platforme SaaS\document_work\rendered_usecases_report\report_usecase_excerpt.pdf"

$wordExisting = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Word.Application")
try {
    $documentQa = $wordExisting.Documents.Open($sourcePath, $false, $true, $false)
    $documentQa.SaveAs2($pdfPath, 17)
    Write-Output "PDF=$pdfPath"
    Write-Output "PAGES=$($documentQa.ComputeStatistics(2))"
}
finally {
    if ($null -ne $documentQa) {
        $documentQa.Close($false)
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($documentQa) | Out-Null
    }
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordExisting) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
