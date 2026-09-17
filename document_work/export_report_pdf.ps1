$ErrorActionPreference = "Stop"

$sourcePath = (Get-ChildItem -LiteralPath "D:\PFE M2\Platforme SaaS\deliverables" -Filter "Master Report - diagrammes use case Draw.io *.docx" | Select-Object -First 1).FullName
$outputDirectory = "D:\PFE M2\Platforme SaaS\document_work\rendered_usecases_report"
$pdfPath = Join-Path $outputDirectory "Master Report - diagrammes use case Drawio integres.pdf"

if ([string]::IsNullOrWhiteSpace($sourcePath)) {
    throw "Le rapport regenere est introuvable."
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $document = $word.Documents.Open($sourcePath, $false, $false)

    foreach ($toc in $document.TablesOfContents) {
        $toc.Update()
    }
    foreach ($tof in $document.TablesOfFigures) {
        $tof.Update()
    }
    foreach ($story in $document.StoryRanges) {
        $range = $story
        while ($null -ne $range) {
            $range.Fields.Update() | Out-Null
            $range = $range.NextStoryRange
        }
    }

    $document.Save()
    $document.ExportAsFixedFormat($pdfPath, 17)
    Write-Output "PDF=$pdfPath"
    Write-Output "PAGES=$($document.ComputeStatistics(2))"
}
finally {
    if ($null -ne $document) {
        $document.Close($false)
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
    }
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
