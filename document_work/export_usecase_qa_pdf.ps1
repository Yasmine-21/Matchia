$ErrorActionPreference = "Stop"
$sourcePath = "D:\PFE M2\Platforme SaaS\document_work\rendered_usecases_report\usecases_visual_qa.docx"
$pdfPath = "D:\PFE M2\Platforme SaaS\document_work\rendered_usecases_report\usecases_visual_qa.pdf"
$logPath = "D:\PFE M2\Platforme SaaS\document_work\rendered_usecases_report\usecases_visual_qa_export.log"

Set-Content -LiteralPath $logPath -Value "start"
$wordExisting = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Word.Application")
Add-Content -LiteralPath $logPath -Value "got-active-word"

try {
    $documentQa = $wordExisting.Documents.Open($sourcePath, $false, $true, $false)
    Add-Content -LiteralPath $logPath -Value "opened"
    $documentQa.SaveAs2($pdfPath, 17)
    Add-Content -LiteralPath $logPath -Value "saved-pdf"
    Write-Output "PDF=$pdfPath"
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
