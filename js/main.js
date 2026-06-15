document.addEventListener('DOMContentLoaded', async () => {
    // Initialize markdown-it
    const md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true
    });

    let contentIndex = [];

    let headerMd = '';
    let footerMd = '';

    // Load static parts
    try {
        const [headerRes, footerRes, contentRes] = await Promise.all([
            fetch('md/parts/header.md'),
            fetch('md/parts/footer.md'),
            fetch('content.json')
        ]);
        
        headerMd = await headerRes.text();
        footerMd = await footerRes.text();
        contentIndex = await contentRes.json();


    } catch (error) {
        console.error('Error loading resources:', error);
        document.body.innerHTML = 'Error loading site.';
        return;
    }



    // Router logic
    async function handleRoute() {
        const params = new URLSearchParams(window.location.search);
        const path = params.get('p') || 'md/index.md';
        const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
        const metadata = contentIndex.find(item => item.path === normalizedPath) || { path: normalizedPath };

        try {
            const response = await fetch(normalizedPath);
            if (!response.ok) throw new Error('File not found');
            const text = await response.text();
            
            const { attributes, body } = parseFrontMatter(text);
            const pageData = { ...metadata, ...attributes };

            // 表示レイアウトはアーカイブデータに保存せず、パス・collection・ファイル名から規約的に推論する。
            // これにより、Markdownファイルには対象そのものを記述するメタデータのみが残り、
            // データの可搬性（別システムへの移行容易性）が保たれる。
            const layout = inferLayout(normalizedPath, pageData);

            document.title = `${pageData.title || 'Traditional Mirai Research Center'} | 伝統みらい研究センター`;
            
            // Construct full markdown
            let contentMarkdown = body;

            // Show latest news on home page
            if (normalizedPath === 'md/index.md') {
                const newsItems = contentIndex.filter(item => item.category === 'news');
                newsItems.sort((a, b) => {
                    const dateA = new Date(a.date || 0);
                    const dateB = new Date(b.date || 0);
                    return dateB - dateA;
                });

                if (newsItems.length > 0) {
                    const latestNews = newsItems[0];
                    
                    // Load News CSS if not already loaded
                    if (!document.getElementById('news-css')) {
                        const link = document.createElement('link');
                        link.id = 'news-css';
                        link.rel = 'stylesheet';
                        link.href = 'css/news.css';
                        document.head.appendChild(link);
                    }

                    const latestNewsHtml = `
<section class="latest-news-section">
    <h2>Latest News</h2>
    <a href="?p=${latestNews.path}" class="news-item latest-news-item">
        <div class="news-image-wrapper">
             ${latestNews.image ? `<img src="${latestNews.image}" alt="${latestNews.title}" class="news-image">` : '<div class="news-image-placeholder"></div>'}
        </div>
        <div class="news-content">
            <div class="news-date">${latestNews.date}</div>
            <h3 class="news-title">${latestNews.title}</h3>
            <p class="news-description">${latestNews.description || ''}</p>
        </div>
    </a>
    <div class="pagination">
        <a href="?p=md/news/index.md" class="pagination-btn">記事一覧を見る</a>
    </div>
</section>
`;
                    // マークダウン本文中に [latest-news] がある場合は置換、ない場合は末尾に追加
                    const placeholderRegex = /\[latest-news\]/i;
                    if (placeholderRegex.test(contentMarkdown)) {
                        contentMarkdown = contentMarkdown.replace(placeholderRegex, latestNewsHtml);
                    } else {
                        contentMarkdown += latestNewsHtml;
                    }
                }
            }

            // Handle collections
            if (pageData.collection) {
                const collectionItems = contentIndex.filter(item => 
                    item.category === pageData.collection || item.collection === pageData.collection
                ).filter(item => item.path !== normalizedPath);

                collectionItems.sort((a, b) => {
                    const dateA = new Date(a.date || 0);
                    const dateB = new Date(b.date || 0);
                    return dateB - dateA;
                });

                // Load News CSS if not already loaded
                if (!document.getElementById('news-css')) {
                    const link = document.createElement('link');
                    link.id = 'news-css';
                    link.rel = 'stylesheet';
                    link.href = 'css/news.css';
                    document.head.appendChild(link);
                }

                // Pagination Logic
                const itemsPerPage = 10;
                const currentPage = parseInt(params.get('page')) || 1;
                const totalItems = collectionItems.length;
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedItems = collectionItems.slice(startIndex, endIndex);

                // Generate HTML List
                const listHtml = paginatedItems.map(item => 
`<a href="?p=${item.path}" class="news-item">
<div class="news-image-wrapper">
${item.image ? `<img src="${item.image}" alt="${item.title}" class="news-image">` : '<div class="news-image-placeholder"></div>'}
</div>
<div class="news-content">
<div class="news-date">${item.date || ''}</div>
<h3 class="news-title">${item.title}</h3>
<p class="news-description">${item.description || ''}</p>
</div>
</a>`
                ).join('');
                
                contentMarkdown += '\n\n<div class="news-list">' + listHtml + '</div>';

                // Generate Pagination Controls
                const prevPage = currentPage > 1 ? currentPage - 1 : null;
                const nextPage = currentPage < totalPages ? currentPage + 1 : null;

                const paginationHtml = `
<div class="pagination">
<a href="${prevPage ? `?p=${path}&page=${prevPage}` : '#'}" class="pagination-btn ${!prevPage ? 'disabled' : ''}">前の10件</a>
<a href="${nextPage ? `?p=${path}&page=${nextPage}` : '#'}" class="pagination-btn ${!nextPage ? 'disabled' : ''}">次の10件</a>
</div>`;

                contentMarkdown += paginationHtml;
            }

            // Clear body
            document.body.innerHTML = '';

            // Render Header
            const headerContainer = document.createElement('header');
            headerContainer.className = 'site-header-container';
            // We need an inner wrapper for the max-width layout
            // Since we can't write HTML tags in markdown, we inject the wrapper here
            const headerInner = document.createElement('div');
            headerInner.className = 'site-header-inner';
            headerInner.innerHTML = md.render(headerMd);

            // Add Hamburger Button
            const menuBtn = document.createElement('button');
            menuBtn.className = 'mobile-menu-btn';
            menuBtn.innerHTML = '<span></span><span></span>';
            menuBtn.setAttribute('aria-label', 'Menu');
            headerInner.appendChild(menuBtn);

            headerContainer.appendChild(headerInner);
            document.body.appendChild(headerContainer);

            // Mobile Menu Logic
            menuBtn.addEventListener('click', () => {
                document.body.classList.toggle('menu-open');
            });

            // Close menu when clicking a link
            headerInner.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    document.body.classList.remove('menu-open');
                });
            });

            // Render Content
            const mainContainer = document.createElement('main');
            mainContainer.className = 'site-main';
            
            // Generate content HTML first
            let htmlContent = md.render(contentMarkdown);

            // Add Back Button for Articles
            if (layout === 'article') {
                // Ensure CSS is loaded
                if (!document.getElementById('news-css')) {
                    const link = document.createElement('link');
                    link.id = 'news-css';
                    link.rel = 'stylesheet';
                    link.href = 'css/news.css';
                    document.head.appendChild(link);
                }

                // 戻り先は、記事が属する親ディレクトリの index.md（＝そのセクションの一覧ページ）とする。
                //   md/news/2026-02-18.md          → md/news/index.md
                //   md/center/member/sample-1.md   → md/center/member/index.md
                // 親 index.md が存在しない場合はトップページへフォールバックし、リンク切れを防ぐ。
                const parentPath = normalizedPath.replace(/\/[^/]+\.md$/, '/index.md');
                const hasParent = contentIndex.some(item => item.path === parentPath);
                const backTarget = hasParent ? parentPath : 'md/index.md';
                const backLabel = hasParent ? '一覧に戻る' : 'ホームに戻る';

                const backBtnHtml = `
                    <div class="pagination">
                        <a href="?p=${backTarget}" class="pagination-btn">
                            ${backLabel}
                        </a>
                    </div>
                `;
                htmlContent += backBtnHtml;
            }

            mainContainer.innerHTML = htmlContent;

            // DEBUG: Force display debugging info (REMOVED)


            document.body.appendChild(mainContainer);

            // Render Footer
            const footerContainer = document.createElement('footer');
            footerContainer.className = 'site-footer';
            footerContainer.innerHTML = md.render(footerMd);
            document.body.appendChild(footerContainer);
            
            // Update body class for page-specific styling
            document.body.className = layout;

            // Re-attach event listeners
            attachListeners();

            // Scroll to top on page transition
            window.scrollTo(0, 0);

        } catch (error) {
            console.error('Error rendering page:', error);
            
            // Load Error CSS
            if (!document.getElementById('error-css')) {
                const link = document.createElement('link');
                link.id = 'error-css';
                link.rel = 'stylesheet';
                link.href = 'css/error.css';
                document.head.appendChild(link);
            }

            document.body.className = 'error-page-body';
            
            // Display debug info on error page too (REMOVED)
            
            document.body.innerHTML = ''; // Clear existing content including header/footer


            // Render Header (re-use logic)
            const headerContainer = document.createElement('header');
            headerContainer.className = 'site-header-container';
            const headerInner = document.createElement('div');
            headerInner.className = 'site-header-inner';
            headerInner.innerHTML = md.render(headerMd);

            // Add Hamburger Button
            const menuBtn = document.createElement('button');
            menuBtn.className = 'mobile-menu-btn';
            menuBtn.innerHTML = '<span></span><span></span>';
            menuBtn.setAttribute('aria-label', 'Menu');
            headerInner.appendChild(menuBtn);

            headerContainer.appendChild(headerInner);
            document.body.appendChild(headerContainer);

            // Mobile Menu Logic
            menuBtn.addEventListener('click', () => {
                document.body.classList.toggle('menu-open');
            });

            // Close menu when clicking a link
            headerInner.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    document.body.classList.remove('menu-open');
                });
            });

            // Render Error Content
            const errorContainer = document.createElement('div');
            errorContainer.className = 'error-page';
            errorContainer.innerHTML = `
                <div class="error-container">
                    <div class="error-image-wrapper">
                        <img src="images/error/404.webp" alt="404 Not Found" class="error-image">
                    </div>
                    <div class="error-text-wrapper">
                        <h1 class="error-title">Oops!</h1>
                        <p class="error-message">ページが見つかりませんでした。</br>URLをご確認いただくか、トップページへお戻りください。</p>
                        <a href="/" class="error-button">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                            Go home
                        </a>
                    </div>
                </div>
            `;
            document.body.appendChild(errorContainer);

            // Render Footer
            const footerContainer = document.createElement('footer');
            footerContainer.className = 'site-footer';
            footerContainer.innerHTML = md.render(footerMd);
            document.body.appendChild(footerContainer);
            
            // Re-attach listener for the home button to use SPA routing if needed, 
            // but a hard reload for home is also fine. Let's make it SPA-friendly.
            document.querySelector('.error-button').addEventListener('click', (e) => {
                e.preventDefault();
                updateRoute('md/index.md');
            });

            // Scroll to top on error page load
            window.scrollTo(0, 0);
        }
    }

    function attachListeners() {
        // Intercept links
        document.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                if (href.startsWith('?p=')) {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const urlParams = new URLSearchParams(href.split('?')[1]);
                        const newPath = urlParams.get('p');
                        const newPage = urlParams.get('page') || 1;
                        updateRoute(newPath, newPage);
                    });
                } else if (href.endsWith('.md') && !href.includes('://')) {
                     link.addEventListener('click', (e) => {
                        e.preventDefault();
                        let targetPath = href.startsWith('/') ? href.slice(1) : href;
                        const target = contentIndex.find(item => item.path === targetPath);
                        updateRoute(target ? target.path : targetPath);
                    });
                }
            }
        });


    }

    function updateRoute(newPath, newPage = 1) {
        const url = new URL(window.location);
        url.searchParams.set('p', newPath);
        if (newPage > 1) {
            url.searchParams.set('page', newPage);
        } else {
            url.searchParams.delete('page');
        }
        window.history.pushState({}, '', url);
        handleRoute();
    }

    window.addEventListener('popstate', handleRoute);
    handleRoute();

    // 表示レイアウトを規約から推論する（アーカイブMarkdown側には layout を持たせない）。
    //   md/index.md            → top    （トップページ）
    //   collection を持つ      → list   （一覧ページ。主にセクションの index.md）
    //   ファイル名が index.md  → page   （静的な説明ページ）
    //   それ以外（葉の記事）   → article（ニュース・研究成果・メンバー等の個別ページ）
    function inferLayout(path, data) {
        if (path === 'md/index.md') return 'top';
        if (data && data.collection) return 'list';
        if (path.endsWith('/index.md')) return 'page';
        return 'article';
    }

    function parseFrontMatter(text) {
        // Updated regex to handle CRLF and loose spacing
        const pattern = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;
        const match = text.match(pattern);
        if (!match) return { attributes: {}, body: text };
        const yaml = match[1];
        const body = match[2];
        const attributes = {};
        yaml.split(/[\r\n]+/).forEach(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                let value = parts.slice(1).join(':').trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                attributes[key] = value;
            }
        });
        return { attributes, body };
    }
});
