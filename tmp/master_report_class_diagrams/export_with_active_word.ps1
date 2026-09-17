param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPdf
)

$ErrorActionPreference = 'Stop'
$document = $null
$word = [Runtime.InteropServices.Marshal]::GetActiveObject('Word.Application')
Write-Output 'Active Word instance acquired'
try {
    $oldAlerts = $word.DisplayAlerts
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($InputPath, $false, $false, $false)
    Write-Output 'Document opened'
    foreach ($story in $document.StoryRanges) {
        $range = $story
        while ($null -ne $range) {
            if ($range.Fields.Count -gt 0) { [void]$range.Fields.Update() }
            $range = $range.NextStoryRange
        }
    }
    foreach ($toc in $document.TablesOfContents) { [void]$toc.Update() }
    foreach ($tof in $document.TablesOfFigures) { [void]$tof.Update() }
    $document.Save()
    Write-Output 'Document saved'
    $document.ExportAsFixedFormat($OutputPdf, 17)
    Write-Output 'PDF exported'
} finally {
    if ($null -ne $document) { $document.Close($false) }
    if ($null -ne $oldAlerts) { $word.DisplayAlerts = $oldAlerts }
    if ($null -ne $document) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($document) }
    if ($null -ne $word) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
