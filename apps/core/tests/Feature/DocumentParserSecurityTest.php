<?php

use App\Services\DocumentParser;

/**
 * Build a .docx whose body is the given document.xml.
 */
function docxWithBody(string $documentXml): string
{
    $path = tempnam(sys_get_temp_dir(), 'docx');
    $zip = new ZipArchive;
    $zip->open($path, ZipArchive::OVERWRITE);
    $zip->addFromString('word/document.xml', $documentXml);
    $zip->close();

    return $path;
}

test('a docx with an external entity cannot read server files', function () {
    $secretFile = tempnam(sys_get_temp_dir(), 'secret');
    file_put_contents($secretFile, 'APP_KEY=base64:leaked-secret');

    $path = docxWithBody(
        '<?xml version="1.0"?><!DOCTYPE d [<!ENTITY xxe SYSTEM "file://'.$secretFile.'">]>'
        .'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        .'<w:body><w:p><w:r><w:t>&xxe;</w:t></w:r></w:p></w:body></w:document>'
    );

    $result = app(DocumentParser::class)->extractText($path, 'docx');

    expect($result['success'])->toBeFalse()
        ->and($result['text'])->not->toContain('leaked-secret');
});

test('an ordinary docx is still parsed', function () {
    $path = docxWithBody(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        .'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        .'<w:body><w:p><w:r><w:t>Refunds take 7 days.</w:t></w:r></w:p></w:body></w:document>'
    );

    $result = app(DocumentParser::class)->extractText($path, 'docx');

    expect($result['success'])->toBeTrue()
        ->and($result['text'])->toContain('Refunds take 7 days.');
});
