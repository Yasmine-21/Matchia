$ErrorActionPreference = 'Stop'

$inputDocument = 'D:\PFE M2\Platforme SaaS\deliverables\Master Report - diagrammes UML complets corriges.docx'
$outputDirectory = 'D:\PFE M2\Platforme SaaS\document_work\qa_master_report_complete_corrected'
$outputPdf = Join-Path $outputDirectory 'Master Report - diagrammes UML complets corriges.pdf'

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$word = $null
$document = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($inputDocument, $false, $true)
    $document.ExportAsFixedFormat($outputPdf, 17)
    Write-Output $outputPdf
}
finally {
    if ($document -ne $null) {
        $document.Close($false)
    }
    if ($word -ne $null) {
        $word.Quit()
    }
}
