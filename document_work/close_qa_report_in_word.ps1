$ErrorActionPreference = "Stop"
$wordExisting = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Word.Application")
$closed = 0

try {
    $documents = @($wordExisting.Documents)
    foreach ($document in $documents) {
        $fullName = $document.FullName
        if ($fullName -like "D:\PFE M2\Platforme SaaS\deliverables\Master Report - diagrammes use case Draw.io *.docx") {
            $document.Close($false)
            $closed += 1
        }
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
    }
    Write-Output "CLOSED=$closed"
}
finally {
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wordExisting) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
