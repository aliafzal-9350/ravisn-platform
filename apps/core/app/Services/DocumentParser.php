<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser as PdfParser;

class DocumentParser
{
    /**
     * Extract raw text from an uploaded document (.pdf, .docx, .txt, .csv).
     *
     * @return array{success: bool, text: string, page_count: int, char_count: int, error: ?string}
     */
    public function extractText(UploadedFile|string $file, ?string $extension = null): array
    {
        $filePath = $file instanceof UploadedFile ? $file->getRealPath() : $file;
        $ext = strtolower($extension ?: ($file instanceof UploadedFile ? $file->getClientOriginalExtension() : pathinfo($filePath, PATHINFO_EXTENSION)));

        if (! file_exists($filePath)) {
            return [
                'success' => false,
                'text' => '',
                'page_count' => 0,
                'char_count' => 0,
                'error' => "File not found: {$filePath}",
            ];
        }

        switch ($ext) {
            case 'docx':
            case 'doc':
                return $this->extractFromDocx($filePath);

            case 'pdf':
                return $this->extractFromPdf($filePath);

            case 'txt':
                $text = @file_get_contents($filePath);
                $clean = trim((string) $text);

                return [
                    'success' => ! empty($clean),
                    'text' => $clean,
                    'page_count' => 1,
                    'char_count' => mb_strlen($clean),
                    'error' => empty($clean) ? 'Empty text file.' : null,
                ];

            case 'csv':
                return $this->extractFromCsv($filePath);

            default:
                $text = @file_get_contents($filePath);
                $clean = trim(preg_replace('/[^\x20-\x7E\t\r\n]/', ' ', (string) $text));

                return [
                    'success' => ! empty($clean),
                    'text' => $clean,
                    'page_count' => 1,
                    'char_count' => mb_strlen($clean),
                    'error' => empty($clean) ? 'Unsupported or unreadable file format.' : null,
                ];
        }
    }

    /**
     * Extract clean text and paragraphs from .docx using native ZipArchive.
     */
    protected function extractFromDocx(string $filePath): array
    {
        try {
            $zip = new \ZipArchive;
            if ($zip->open($filePath) !== true) {
                return [
                    'success' => false,
                    'text' => '',
                    'page_count' => 0,
                    'char_count' => 0,
                    'error' => 'Unable to unpack DOCX archive.',
                ];
            }

            $xmlContent = $zip->getFromName('word/document.xml');
            $zip->close();

            if (! $xmlContent) {
                return [
                    'success' => false,
                    'text' => '',
                    'page_count' => 0,
                    'char_count' => 0,
                    'error' => 'No document.xml stream located inside DOCX.',
                ];
            }

            // Parse document.xml and collect paragraphs
            $dom = new \DOMDocument;
            @$dom->loadXML($xmlContent, LIBXML_NOENT | LIBXML_XINCLUDE | LIBXML_NOERROR | LIBXML_NOWARNING);

            $paragraphs = [];
            $pNodes = $dom->getElementsByTagName('p');

            foreach ($pNodes as $pNode) {
                $tNodes = $pNode->getElementsByTagName('t');
                $pText = '';
                foreach ($tNodes as $tNode) {
                    $pText .= $tNode->nodeValue;
                }
                $pText = trim($pText);
                if (! empty($pText)) {
                    $paragraphs[] = $pText;
                }
            }

            $cleanText = implode("\n\n", $paragraphs);
            if (empty($cleanText)) {
                // Fallback tag strip
                $cleanText = trim(strip_tags($xmlContent));
            }

            return [
                'success' => ! empty($cleanText),
                'text' => $cleanText,
                'page_count' => max(1, count($paragraphs) > 0 ? (int) ceil(count($paragraphs) / 5) : 1),
                'char_count' => mb_strlen($cleanText),
                'error' => empty($cleanText) ? 'DOCX contains no readable text.' : null,
            ];
        } catch (\Throwable $e) {
            Log::error('[DocumentParser] DOCX extraction error: '.$e->getMessage());

            return [
                'success' => false,
                'text' => '',
                'page_count' => 0,
                'char_count' => 0,
                'error' => 'DOCX parsing failed: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Extract text from a PDF using smalot/pdfparser, which correctly handles
     * standard PDF stream encodings (including FlateDecode-compressed
     * content, which the vast majority of real-world PDFs use).
     */
    protected function extractFromPdf(string $filePath): array
    {
        try {
            $pdf = (new PdfParser)->parseFile($filePath);
            $text = trim($pdf->getText());

            return [
                'success' => ! empty($text),
                'text' => $text,
                'page_count' => max(1, count($pdf->getPages())),
                'char_count' => mb_strlen($text),
                'error' => empty($text) ? 'No text could be extracted from PDF.' : null,
            ];
        } catch (\Throwable $e) {
            Log::error('[DocumentParser] PDF extraction error: '.$e->getMessage());

            return [
                'success' => false,
                'text' => '',
                'page_count' => 0,
                'char_count' => 0,
                'error' => 'PDF extraction failed: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Extract CSV rows into structured Q&A text.
     */
    protected function extractFromCsv(string $filePath): array
    {
        $rows = array_map('str_getcsv', file($filePath));
        $lines = [];
        foreach ($rows as $row) {
            $cleanRow = array_filter(array_map('trim', $row));
            if (! empty($cleanRow)) {
                $lines[] = implode(' | ', $cleanRow);
            }
        }
        $text = implode("\n", $lines);

        return [
            'success' => ! empty($text),
            'text' => $text,
            'page_count' => 1,
            'char_count' => mb_strlen($text),
            'error' => empty($text) ? 'CSV contains no rows.' : null,
        ];
    }
}
