const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// Permitir solicitudes CORS desde cualquier origen
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
};

module.exports = async (req, res) => {
    setCorsHeaders(res);

    // Si es un preflight request de CORS (OPTIONS) respondemos status 200
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        console.log('Iniciando Chromium...');

        // Optimizar para el runtime serverless de Vercel
        chromium.setHostedMode = true;

        const executablePath = await chromium.executablePath();

        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath || puppeteer.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        console.log('Navegando a LibrefutbolTV...');

        // Timeout generoso
        await page.goto('https://librefutboltv.su/home1/agenda/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('Extrayendo los partidos...');

        const extractedMatches = await page.evaluate(() => {
            const matchesList = [];
            // Seleccionamos los LI que tengan tiempo o estructura de partido.
            // Para abarcar el mayor espectro adaptado del código original "main.js" de Electron.
            const listItems = document.querySelectorAll('ul.menu > li, li:has(span.t)');

            listItems.forEach(item => {
                const mainLink = item.querySelector('a:first-child');
                if (!mainLink) return;

                const timeSpan = mainLink.querySelector('span.t') || mainLink.querySelector('span[class*="time"]');
                if (!timeSpan) return;

                const time = timeSpan.textContent.trim();
                let title = mainLink.textContent.trim().replace(time, '').trim();

                if (!title || title.length < 3) return;

                const streamLink = item.querySelector('ul a[href]:not([href="#"])') ||
                    item.querySelector('a[href]:not([href="#"]):not(:first-child)');

                let url = null;
                let available = true;

                if (!streamLink || !streamLink.getAttribute('href') || streamLink.getAttribute('href') === '#' || streamLink.getAttribute('href').startsWith('javascript:')) {
                    available = false;
                } else {
                    url = streamLink.getAttribute('href');
                    if (!url.startsWith('http')) {
                        url = url.startsWith('/') ? 'https://librefutboltv.su' + url : 'https://librefutboltv.su/' + url;
                    }
                }

                matchesList.push({
                    title,
                    time,
                    url,
                    available
                });
            });

            return matchesList;
        });

        await browser.close();

        console.log(`Partidos extraídos: ${extractedMatches.length}`);

        // Responder con la lista en formato JSON
        res.status(200).json({
            success: true,
            count: extractedMatches.length,
            matches: extractedMatches
        });

    } catch (error) {
        console.error('Error durante el scraping:', error);
        res.status(500).json({
            success: false,
            message: 'Error extrayendo los partidos',
            error: error.message
        });
    }
};
