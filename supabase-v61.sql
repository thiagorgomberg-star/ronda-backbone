-- =====================================================================
-- v61: conjunta de site (Multivale x provedor parceiro)
--  As curvas do OTDR (TX e RX) que o supervisor anexa podem vir em PDF ou no arquivo do OTDR (.sor),
--  além de imagem. O bucket "fotos" passa a aceitar esses dois tipos (continua privado, só membros da org).
--  A conjunta fica na tabela eventos (dados.tipo = 'site'); o supervisor grava as curvas em dados.site.curvas.
-- =====================================================================
update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf','application/octet-stream']
 where id = 'fotos';
