<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
	xmlns:kml="http://www.opengis.net/kml/2.2">
	<xsl:output method="html" encoding="UTF-8" />
	<xsl:template match="/">
		<html>
			<head>
				<title>Roberts Hearing Clinic Sitemap</title>
				<style>
					body { font-family: Arial, sans-serif; color: #222; margin: 40px; }
					table { border-collapse: collapse; width: 100%; max-width: 1100px; }
					th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; }
					th { background: #f6f6f6; }
					a { color: #aa0000; }
				</style>
			</head>
			<body>
				<h1>Roberts Hearing Clinic Sitemap</h1>
				<table>
					<thead>
						<tr>
							<th>URL</th>
							<th>Last Modified</th>
						</tr>
					</thead>
					<tbody>
						<xsl:for-each select="//sitemap:sitemap | //sitemap:url">
							<tr>
								<td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc" /></a></td>
								<td><xsl:value-of select="sitemap:lastmod" /></td>
							</tr>
						</xsl:for-each>
						<xsl:for-each select="//kml:Placemark">
							<tr>
								<td><xsl:value-of select="kml:name" /></td>
								<td><xsl:value-of select="kml:address" /></td>
							</tr>
						</xsl:for-each>
					</tbody>
				</table>
			</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
