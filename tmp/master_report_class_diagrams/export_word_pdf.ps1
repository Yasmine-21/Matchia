param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPdf,
    [switch]$UpdateFields
)

$ErrorActionPreference = 'Stop'
$word = $null
$document = $null
try {
    Write-Output 'Creating Word instance'
    $word = New-Object -ComObject Word.Application
    Write-Output 'Word instance created'
    $word.Visible = $false
    $word.DisplayAlerts = 0
    Write-Output 'Opening document'
    $document = $word.Documents.Open($InputPath, $false, -not $UpdateFields)
    Write-Output 'Document opened'
    if ($UpdateFields) {
        Write-Output 'Updating story fields'
        foreach ($story in $document.StoryRanges) {
            $range = $story
            while ($null -ne $range) {
                if ($range.Fields.Count -gt 0) { [void]$range.Fields.Update() }
                $range = $range.NextStoryRange
            }
        }
        Write-Output 'Updating tables of contents'
        foreach ($toc in $document.TablesOfContents) { [void]$toc.Update() }
        Write-Output 'Updating tables of figures'
        foreach ($tof in $document.TablesOfFigures) { [void]$tof.Update() }
        Write-Output 'Saving document'
        $document.Save()
        Write-Output 'Document saved'
    }
    Write-Output 'Exporting PDF'
    $document.ExportAsFixedFormat($OutputPdf, 17)
    Write-Output 'PDF exported'
} finally {
    if ($null -ne $document) { $document.Close($false) }
    if ($null -ne $word) { $word.Quit() }
    if ($null -ne $document) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($document) }
    if ($null -ne $word) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
