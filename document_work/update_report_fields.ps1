$ErrorActionPreference = "Stop"
$sourcePath = (Get-ChildItem -LiteralPath "D:\PFE M2\Platforme SaaS\deliverables" -Filter "Master Report - diagrammes use case Draw.io *.docx" | Select-Object -First 1).FullName
$logPath = "D:\PFE M2\Platforme SaaS\document_work\rendered_usecases_report\update_fields.log"

Set-Content -LiteralPath $logPath -Value "start"
$wordExisting = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Word.Application")

try {
    $documentFinal = $wordExisting.Documents.Open($sourcePath, $false, $false, $false)
    Add-Content -LiteralPath $logPath -Value "opened"
    foreach ($toc in $documentFinal.TablesOfContents) {
        $toc.Update()
    }
    Add-Content -LiteralPath $logPath -Value "toc-updated"
    foreach ($tof in $documentFinal.TablesOfFigures) {
        $tof.Update()
    }
    Add-Content -LiteralPath $logPath -Value "figures-updated"
    $documentFinal.Save()
    Add-Content -LiteralPath $logPath -Value "saved"
    Write-Output "UPDATED=$sourcePath"
}
catch {
    Add-Content -LiteralPath $logPath -Value ("ERROR=" + $_.Exception.ToString())
    throw
}
finally {
    if ($null -ne $documentFinal) {
        $documentFinal.Close($false)
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($documentFinal) | Out-Null
    }
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordExisting) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
    Add-Content -LiteralPath $logPath -Value "finished"
}
