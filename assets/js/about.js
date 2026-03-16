// About page functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Set up breadcrumbs using BreadcrumbManager
    BreadcrumbManager.setBreadcrumb(BreadcrumbManager.createSimple('Σχετικά με εμάs'));
    
    await loadAboutContent();
});

async function loadAboutContent() {
    try {
        const response = await fetch(`${API_BASE}/public.php?action=get_settings`);
        const settings = await response.json();

        if (!settings.error) {
            const aboutText = document.getElementById('aboutText');
            if (aboutText && settings.about_us_text) {
                aboutText.innerHTML = `<p>${settings.about_us_text}</p>`;
            }

            const mapsIframe = document.getElementById('mapsIframe');
            if (mapsIframe && settings.maps_iframe_url) {
                let srcUrl = settings.maps_iframe_url;
                
                // If the stored value is full iframe HTML, extract the src attribute
                if (srcUrl.includes('<iframe')) {
                    const srcMatch = srcUrl.match(/src="([^"]*)"/);
                    if (srcMatch && srcMatch[1]) {
                        srcUrl = srcMatch[1];
                    } else {
                        console.warn('Could not extract src from iframe HTML');
                        return;
                    }
                }
                
                mapsIframe.src = srcUrl;
            }
        }
    } catch (error) {
        console.error('Error loading about content:', error);
    }
}
