"""Small, entirely fictional fixtures. No personal portfolio content."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root=Path(__file__).parent/'fixtures'
root.mkdir(exist_ok=True)
paragraphs=['# 테스트 프로젝트 A','제가 API 테스트를 작성했습니다. 수치는 미측정입니다.','# 테스트 프로젝트 B','배포 체크 목록을 문서화했습니다.']
xml='<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+''.join('<w:p><w:r><w:t>'+p+'</w:t></w:r></w:p>' for p in paragraphs)+'</w:body></w:document>'
with ZipFile(root/'synthetic-projects.docx','w',ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    z.writestr('word/document.xml',xml)

def pdf(path, text):
    content=('BT /F1 12 Tf 40 750 Td ('+text+') Tj ET').encode('ascii') if text else b''
    objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',b'<< /Length '+str(len(content)).encode()+b' >>\nstream\n'+content+b'\nendstream']
    output=bytearray(b'%PDF-1.4\n');offsets=[0]
    for i,o in enumerate(objects,1):
        offsets.append(len(output));output.extend(f'{i} 0 obj\n'.encode()+o+b'\nendobj\n')
    start=len(output);output.extend(b'xref\n0 6\n0000000000 65535 f \n')
    for n in offsets[1:]:output.extend(f'{n:010} 00000 n \n'.encode())
    output.extend(f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{start}\n%%EOF'.encode());path.write_bytes(output)

pdf(root/'synthetic-project.pdf','Project A: I wrote API tests. No performance metric was measured.')
pdf(root/'image-only.pdf','')
print('Generated fictional DOCX/PDF and empty text-layer fixtures.')
