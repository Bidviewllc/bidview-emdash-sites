<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:kml="http://www.opengis.net/kml/2.2"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html>
<head>
<title>XML Sitemap - Rose Hearing Healthcare Centers</title>
<style>
body{font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;margin:0;color:#222;background:#fff}
a{color:#0073aa;text-decoration:none}
#content{padding:20px 42px}
table{border-collapse:collapse;width:100%;max-width:1220px}
th{background:#4275f4;color:#fff;text-align:left;padding:15px 10px}
td{padding:10px;border-bottom:1px solid #ddd}
tr:nth-child(even){background:#f7f7f7}
.expl{margin:0 0 18px}
</style>
</head>
<body>
<div id="content">
<xsl:choose>
<xsl:when test="count(sitemap:sitemapindex/sitemap:sitemap) &gt; 0">
<p class="expl">This XML Sitemap Index file contains <strong><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></strong> sitemaps.</p>
<table><thead><tr><th width="75%">Sitemap</th><th width="25%">Last Modified</th></tr></thead><tbody>
<xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
<tr><td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td><td><xsl:value-of select="concat(substring(sitemap:lastmod,1,10),' ',substring(sitemap:lastmod,12,5),' ',substring(sitemap:lastmod,20,6))"/></td></tr>
</xsl:for-each>
</tbody></table>
</xsl:when>
<xsl:when test="count(sitemap:urlset/sitemap:url) &gt; 0">
<p class="expl">This XML Sitemap contains <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> URLs.</p>
<p class="expl"><a href="sitemap_index.xml">&#8592; Sitemap Index</a></p>
<table><thead><tr><th width="75%">URL</th><th width="5%">Images</th><th width="20%">Last Mod.</th></tr></thead><tbody>
<xsl:for-each select="sitemap:urlset/sitemap:url">
<tr><td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td><td><xsl:value-of select="count(image:image)"/></td><td><xsl:value-of select="concat(substring(sitemap:lastmod,1,10),' ',substring(sitemap:lastmod,12,5),' ',substring(sitemap:lastmod,20,6))"/></td></tr>
</xsl:for-each>
</tbody></table>
</xsl:when>
<xsl:otherwise>
<p class="expl">This KML file contains <strong><xsl:value-of select="count(kml:kml/kml:Document/kml:Folder/kml:Placemark)"/></strong> Locations.</p>
<p class="expl"><a href="sitemap_index.xml">&#8592; Sitemap Index</a></p>
<table><thead><tr><th>Name</th><th>Address</th><th>Phone number</th><th>Latitude</th><th>Longitude</th></tr></thead><tbody>
<xsl:for-each select="kml:kml/kml:Document/kml:Folder/kml:Placemark">
<tr><td><a href="{atom:link/@href}"><xsl:value-of select="kml:name"/></a></td><td><xsl:value-of select="kml:address"/></td><td><xsl:value-of select="kml:phoneNumber"/></td><td><xsl:value-of select="kml:LookAt/kml:latitude"/></td><td><xsl:value-of select="kml:LookAt/kml:longitude"/></td></tr>
</xsl:for-each>
</tbody></table>
</xsl:otherwise>
</xsl:choose>
</div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
