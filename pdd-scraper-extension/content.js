(function() {
  'use strict';
  
  let floatBtn = null;
  let progressDiv = null;
  let isScraping = false;
  
  const DEBUG = true;
  
  function log(message, data) {
    if (DEBUG) {
      if (data) {
        console.log('[拼多多采集助手] ' + message, data);
      } else {
        console.log('[拼多多采集助手] ' + message);
      }
    }
  }
  
  function init() {
    createFloatButton();
    createProgressDiv();
    log('已初始化，等待用户点击采集');
  }
  
  function createFloatButton() {
    floatBtn = document.createElement('div');
    floatBtn.id = 'pdd-scraper-float-btn';
    floatBtn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
      <div class="status">点击采集商品信息</div>
    `;
    
    document.body.appendChild(floatBtn);
    
    floatBtn.addEventListener('click', handleScrape);
    
    floatBtn.addEventListener('mouseenter', function() {
      floatBtn.classList.add('show-status');
    });
    
    floatBtn.addEventListener('mouseleave', function() {
      floatBtn.classList.remove('show-status');
    });
  }
  
  function createProgressDiv() {
    progressDiv = document.createElement('div');
    progressDiv.id = 'pdd-scraper-progress';
    document.body.appendChild(progressDiv);
  }
  
  function showProgress(message) {
    progressDiv.textContent = message;
    progressDiv.classList.add('show');
    log(message);
  }
  
  function hideProgress() {
    setTimeout(function() {
      progressDiv.classList.remove('show');
    }, 3000);
  }
  
  async function handleScrape() {
    if (isScraping) {
      log('正在采集中，请勿重复点击');
      return;
    }
    
    isScraping = true;
    floatBtn.classList.add('loading');
    showProgress('正在采集商品信息，请稍候...');
    
    try {
      const productInfo = await scrapeProductInfo();
      log('采集到的商品信息:', productInfo);
      
      if (productInfo && (productInfo.productName || productInfo.price || productInfo.mainImage)) {
        showProgress('采集成功！正在保存数据...');
        
        await saveProductData(productInfo);
        
        floatBtn.classList.remove('loading');
        floatBtn.classList.add('success');
        showProgress('✓ 商品信息已保存到本地！');
        
        setTimeout(function() {
          floatBtn.classList.remove('success');
          hideProgress();
        }, 3000);
      } else {
        showProgress('⚠️ 部分信息未采集到，请检查页面是否完全加载');
        floatBtn.classList.remove('loading');
        floatBtn.classList.add('error');
        
        setTimeout(function() {
          floatBtn.classList.remove('error');
          hideProgress();
        }, 5000);
      }
    } catch (error) {
      log('采集失败:', error);
      floatBtn.classList.remove('loading');
      floatBtn.classList.add('error');
      showProgress('✗ 采集失败: ' + error.message);
      
      setTimeout(function() {
        floatBtn.classList.remove('error');
        hideProgress();
      }, 3000);
    } finally {
      isScraping = false;
    }
  }
  
  async function scrapeProductInfo() {
    const productInfo = {
      goodsId: getGoodsIdFromUrl(),
      productName: '',
      price: '',
      originalPrice: '',
      sales: '',
      description: '',
      skus: [],
      mainImage: '',
      images: [],
      shopName: '',
      scrapedAt: new Date().toISOString(),
      sourceUrl: window.location.href
    };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    log('开始从多种数据源提取信息...');
    
    productInfo.productName = extractProductName();
    productInfo.price = extractPrice();
    productInfo.originalPrice = extractOriginalPrice();
    productInfo.sales = extractSales();
    productInfo.description = extractDescription();
    productInfo.skus = extractSkus();
    productInfo.mainImage = extractMainImage();
    productInfo.images = extractImages();
    productInfo.shopName = extractShopName();
    
    if (!productInfo.productName || !productInfo.price) {
      log('尝试从页面JavaScript变量中提取数据...');
      const jsData = extractFromJavaScript();
      if (jsData) {
        if (!productInfo.productName && jsData.productName) {
          productInfo.productName = jsData.productName;
        }
        if (!productInfo.price && jsData.price) {
          productInfo.price = jsData.price;
        }
        if (!productInfo.mainImage && jsData.mainImage) {
          productInfo.mainImage = jsData.mainImage;
        }
        if (!productInfo.images.length && jsData.images && jsData.images.length) {
          productInfo.images = jsData.images;
        }
      }
    }
    
    return productInfo;
  }
  
  function getGoodsIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const goodsId = urlParams.get('goods_id');
    if (goodsId) {
      log('从URL获取到商品ID:', goodsId);
      return goodsId;
    }
    
    const urlMatch = window.location.href.match(/goods_id=(\d+)/);
    if (urlMatch) {
      log('从正则匹配获取到商品ID:', urlMatch[1]);
      return urlMatch[1];
    }
    
    return 'unknown';
  }
  
  function extractProductName() {
    log('开始提取商品名称...');
    
    const selectors = [
      '[class*="goods-title"]',
      '[class*="goodsTitle"]',
      '[class*="good-title"]',
      '[class*="goodTitle"]',
      '[class*="product-title"]',
      '[class*="productTitle"]',
      '.title',
      '[data-title]',
      '[class*="title"]',
      'h1',
      'h2'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent.trim();
          if (text && text.length > 5 && text.length < 200) {
            if (!text.includes('￥') && !text.includes('¥') && !text.match(/^\d+(\.\d+)?$/)) {
              log('从选择器"' + selector + '"提取到商品名称:', text.substring(0, 50));
              return text.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ');
            }
          }
        }
      } catch (e) {
        log('选择器' + selector + '执行失败:', e);
      }
    }
    
    const allTexts = [];
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      try {
        const text = el.textContent.trim();
        if (text && text.length > 10 && text.length < 150) {
          if (!text.includes('￥') && !text.includes('¥') && !text.includes('已拼') && !text.includes('件')) {
            if (!text.includes('收藏') && !text.includes('关注') && !text.includes('客服')) {
              allTexts.push({ text: text, length: text.length });
            }
          }
        }
      } catch (e) {}
    }
    
    allTexts.sort((a, b) => b.length - a.length);
    if (allTexts.length > 0) {
      log('从页面文本中找到最可能的商品名称:', allTexts[0].text.substring(0, 50));
      return allTexts[0].text.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ');
    }
    
    log('未能提取到商品名称');
    return '';
  }
  
  function extractPrice() {
    log('开始提取价格...');
    
    const patterns = [
      /[￥¥](\d+\.?\d*)/g,
      /价格[：:]\s*[￥¥]?(\d+\.?\d*)/,
      /现价[：:]\s*[￥¥]?(\d+\.?\d*)/,
      /(\d+\.?\d*)\s*元/,
      /(\d+\.?\d*)\s*券后价/,
      /(\d+\.?\d*)\s*起/
    ];
    
    const allText = document.body.innerText;
    
    for (const pattern of patterns) {
      if (pattern.global) {
        const matches = [...allText.matchAll(pattern)];
        for (const match of matches) {
          const price = parseFloat(match[1]);
          if (price > 0 && price < 100000) {
            log('从文本中提取到价格:', price);
            return String(price);
          }
        }
      } else {
        const match = allText.match(pattern);
        if (match) {
          const price = parseFloat(match[1]);
          if (price > 0 && price < 100000) {
            log('从文本中提取到价格:', price);
            return String(price);
          }
        }
      }
    }
    
    const selectors = [
      '[class*="price"]',
      '[class*="Price"]',
      '[class*="pdd-price"]',
      '[class*="pddPrice"]',
      '[class*="current-price"]',
      '[class*="currentPrice"]'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent.trim();
          const priceMatch = text.match(/(\d+\.?\d*)/);
          if (priceMatch) {
            const price = parseFloat(priceMatch[1]);
            if (price > 0 && price < 100000) {
              log('从选择器"' + selector + '"提取到价格:', price);
              return String(price);
            }
          }
        }
      } catch (e) {}
    }
    
    log('未能提取到价格');
    return '';
  }
  
  function extractOriginalPrice() {
    log('开始提取原价...');
    
    const patterns = [
      /原价[：:]\s*[￥¥]?(\d+\.?\d*)/,
      /划线价[：:]\s*[￥¥]?(\d+\.?\d*)/,
      /[￥¥](\d+\.?\d*)\s*[元]?\s*(?:起)?\s*[原价|划线价]/
    ];
    
    const allText = document.body.innerText;
    
    for (const pattern of patterns) {
      const match = allText.match(pattern);
      if (match) {
        const price = parseFloat(match[1]);
        if (price > 0 && price < 100000) {
          log('从文本中提取到原价:', price);
          return String(price);
        }
      }
    }
    
    const selectors = [
      '[class*="original"]',
      '[class*="Original"]',
      '[class*="line-through"]',
      '[class*="lineThrough"]',
      '[class*="del"]',
      '[class*="old-price"]',
      '[class*="oldPrice"]'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent.trim();
          const priceMatch = text.match(/(\d+\.?\d*)/);
          if (priceMatch) {
            const price = parseFloat(priceMatch[1]);
            if (price > 0 && price < 100000) {
              log('从选择器"' + selector + '"提取到原价:', price);
              return String(price);
            }
          }
        }
      } catch (e) {}
    }
    
    log('未能提取到原价');
    return '';
  }
  
  function extractSales() {
    log('开始提取销量...');
    
    const patterns = [
      /已拼(\d+)\s*件/,
      /已售(\d+)\s*件/,
      /(\d+)\s*万?\+?\s*件/,
      /销量[：:]\s*(\d+)/,
      /(\d+\.?\d*)\s*万/,
      /(\d+)\s*人付款/
    ];
    
    const allText = document.body.innerText;
    
    for (const pattern of patterns) {
      const match = allText.match(pattern);
      if (match) {
        let sales = match[1];
        if (sales.includes('万') || allText.substring(match.index, match.index + 20).includes('万')) {
          sales = parseFloat(sales) * 10000;
          sales = Math.floor(sales);
        }
        log('从文本中提取到销量:', sales);
        return String(sales);
      }
    }
    
    log('未能提取到销量');
    return '';
  }
  
  function extractDescription() {
    log('开始提取商品描述...');
    
    const selectors = [
      '[class*="desc"]',
      '[class*="Desc"]',
      '[class*="detail"]',
      '[class*="Detail"]',
      '[class*="introduction"]',
      '[class*="Introduction"]'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent.trim();
          if (text && text.length > 20 && text.length < 2000) {
            const cleanText = text.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ');
            if (!cleanText.includes('￥') && !cleanText.includes('¥')) {
              log('从选择器"' + selector + '"提取到描述，长度:', cleanText.length);
              return cleanText.substring(0, 500);
            }
          }
        }
      } catch (e) {}
    }
    
    log('未能提取到商品描述');
    return '';
  }
  
  function extractSkus() {
    log('开始提取SKU...');
    
    const skus = [];
    const skuTexts = new Set();
    
    const selectors = [
      '[class*="sku"]',
      '[class*="Sku"]',
      '[class*="spec"]',
      '[class*="Spec"]',
      '[class*="option"]',
      '[class*="Option"]',
      '[class*="attrs"]',
      '[class*="Attrs"]',
      '[class*="property"]',
      '[class*="Property"]'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent.trim();
          if (text && text.length > 1 && text.length < 50) {
            if (!text.includes('￥') && !text.includes('¥') && !text.includes('已拼')) {
              if (!skuTexts.has(text)) {
                skuTexts.add(text);
                skus.push({
                  name: text,
                  price: '',
                  stock: ''
                });
              }
            }
          }
        }
      } catch (e) {}
    }
    
    log('提取到' + skus.length + '个SKU');
    return skus.slice(0, 10);
  }
  
  function extractMainImage() {
    log('开始提取主图...');
    
    const imgSelectors = [
      '[class*="main"] img',
      '[class*="Main"] img',
      '[class*="goods-img"] img',
      '[class*="goodsImg"] img',
      '[class*="goods-image"] img',
      '[class*="goodsImage"] img',
      '[class*="product-img"] img',
      '[class*="productImg"] img',
      '[class*="banner"] img',
      '[class*="Banner"] img'
    ];
    
    for (const selector of imgSelectors) {
      try {
        const img = document.querySelector(selector);
        if (img) {
          const src = img.src || img.dataset.src || img.getAttribute('data-src');
          if (src) {
            const cleanUrl = cleanImageUrl(src);
            if (cleanUrl && (cleanUrl.includes('pddpic') || cleanUrl.includes('pinduoduo'))) {
              log('从选择器"' + selector + '"提取到主图:', cleanUrl.substring(0, 80));
              return cleanUrl;
            }
          }
        }
      } catch (e) {}
    }
    
    const allImages = document.querySelectorAll('img');
    for (const img of allImages) {
      try {
        const src = img.src || img.dataset.src || img.getAttribute('data-src');
        if (src && (src.includes('pddpic') || src.includes('pinduoduo'))) {
          if (!src.includes('thumb') && !src.includes('thumbnail') && !src.includes('avatar')) {
            const cleanUrl = cleanImageUrl(src);
            log('从页面图片中提取到主图:', cleanUrl.substring(0, 80));
            return cleanUrl;
          }
        }
      } catch (e) {}
    }
    
    log('未能提取到主图');
    return '';
  }
  
  function extractImages() {
    log('开始提取商品图片...');
    
    const images = [];
    const imageUrls = new Set();
    
    const allImages = document.querySelectorAll('img');
    for (const img of allImages) {
      try {
        const src = img.src || img.dataset.src || img.getAttribute('data-src');
        if (src && (src.includes('pddpic') || src.includes('pinduoduo'))) {
          if (!src.includes('thumb') && !src.includes('thumbnail') && !src.includes('avatar') && !src.includes('logo')) {
            const cleanUrl = cleanImageUrl(src);
            if (!imageUrls.has(cleanUrl)) {
              imageUrls.add(cleanUrl);
              images.push(cleanUrl);
            }
          }
        }
      } catch (e) {}
    }
    
    log('提取到' + images.length + '张商品图片');
    return images.slice(0, 20);
  }
  
  function cleanImageUrl(url) {
    if (!url) return '';
    
    let cleanUrl = url;
    
    const sizePatterns = [
      /\?imageMogr2.*$/,
      /\?imageView2.*$/,
      /\?.*$/,
      /\.(jpeg|jpg|png|gif|webp)\.a\.(jpeg|jpg|png|gif|webp)$/i
    ];
    
    for (const pattern of sizePatterns) {
      cleanUrl = cleanUrl.replace(pattern, '');
    }
    
    return cleanUrl;
  }
  
  function extractShopName() {
    log('开始提取店铺名称...');
    
    const selectors = [
      '[class*="shop-name"]',
      '[class*="shopName"]',
      '[class*="store-name"]',
      '[class*="storeName"]',
      '[class*="shop-title"]',
      '[class*="shopTitle"]'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent.trim();
          if (text && text.length > 2 && text.length < 50) {
            if (!text.includes('收藏') && !text.includes('关注') && !text.includes('客服')) {
              if (!text.includes('￥') && !text.includes('¥')) {
                log('从选择器"' + selector + '"提取到店铺名称:', text);
                return text;
              }
            }
          }
        }
      } catch (e) {}
    }
    
    log('未能提取到店铺名称');
    return '';
  }
  
  function extractFromJavaScript() {
    log('尝试从JavaScript变量中提取数据...');
    
    const result = {
      productName: '',
      price: '',
      mainImage: '',
      images: []
    };
    
    try {
      if (window.__INITIAL_STATE__) {
        log('找到__INITIAL_STATE__变量');
        const state = window.__INITIAL_STATE__;
        if (state.goodsDetail) {
          const detail = state.goodsDetail;
          if (detail.goodsName) result.productName = detail.goodsName;
          if (detail.minNormalPrice) result.price = String(detail.minNormalPrice / 100);
          if (detail.hdThumbUrl) result.mainImage = detail.hdThumbUrl;
        }
      }
      
      if (window.goodsData) {
        log('找到goodsData变量');
        const data = window.goodsData;
        if (data.goods_name) result.productName = data.goods_name;
        if (data.min_group_price) result.price = String(data.min_group_price / 100);
        if (data.goods_image_url) result.mainImage = data.goods_image_url;
      }
      
      if (window.__NEXT_DATA__) {
        log('找到__NEXT_DATA__变量');
        const nextData = window.__NEXT_DATA__;
        if (nextData.props && nextData.props.pageProps) {
          const props = nextData.props.pageProps;
          if (props.goodsDetail) {
            const detail = props.goodsDetail;
            if (detail.goodsName) result.productName = detail.goodsName;
            if (detail.minNormalPrice) result.price = String(detail.minNormalPrice);
          }
        }
      }
      
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent;
        if (content && content.length > 0) {
          const nameMatch = content.match(/goodsName["']?\s*[:=]\s*["']([^"']+)["']/);
          if (nameMatch && !result.productName) {
            result.productName = nameMatch[1];
            log('从script中找到商品名称:', result.productName.substring(0, 50));
          }
          
          const priceMatch = content.match(/(?:price|Price)["']?\s*[:=]\s*["']?(\d+\.?\d*)["']?/);
          if (priceMatch && !result.price) {
            result.price = priceMatch[1];
            log('从script中找到价格:', result.price);
          }
          
          const imgMatch = content.match(/(?:image|Image|img|Img)["']?\s*[:=]\s*["']([^"']+pddpic[^"']+)["']/);
          if (imgMatch && !result.mainImage) {
            result.mainImage = imgMatch[1];
            log('从script中找到主图');
          }
        }
      }
      
      const metaTags = document.querySelectorAll('meta[property="og:title"], meta[name="title"], meta[property="og:image"], meta[name="image"]');
      for (const meta of metaTags) {
        const property = meta.getAttribute('property') || meta.getAttribute('name') || '';
        const content = meta.getAttribute('content');
        
        if (property.includes('title') && content && !result.productName) {
          result.productName = content;
          log('从meta标签找到商品名称:', content.substring(0, 50));
        }
        
        if (property.includes('image') && content && !result.mainImage) {
          if (content.includes('pddpic') || content.includes('pinduoduo')) {
            result.mainImage = content;
            log('从meta标签找到主图');
          }
        }
      }
      
    } catch (e) {
      log('从JavaScript提取数据时出错:', e);
    }
    
    return result;
  }
  
  async function saveProductData(productInfo) {
    const timestamp = new Date().getTime();
    const goodsId = productInfo.goodsId || 'unknown';
    const safeProductName = sanitizeFileName(productInfo.productName || 'product');
    const shortName = safeProductName.substring(0, 20);
    
    const baseName = `pdd_${goodsId}_${shortName}_${timestamp}`;
    
    log('开始保存数据，基础文件名:', baseName);
    
    await downloadCSV(productInfo, baseName);
    
    if (productInfo.mainImage) {
      log('开始下载主图...');
      await downloadImageViaBackground(productInfo.mainImage, `${baseName}_主图`);
    }
    
    for (let i = 0; i < productInfo.images.length && i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      await downloadImageViaBackground(productInfo.images[i], `${baseName}_图片${i + 1}`);
    }
  }
  
  function sanitizeFileName(name) {
    return name
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/[\r\n\t]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  }
  
  function downloadCSV(productInfo, baseName) {
    return new Promise((resolve, reject) => {
      const headers = [
        '商品ID', '商品名称', '价格', '原价', '销量', '店铺名称',
        '商品描述', 'SKU信息', '主图URL', '所有图片URL', '采集时间', '来源URL'
      ];
      
      const skuText = productInfo.skus.map(s => s.name).join('; ');
      const imagesText = productInfo.images.join('; ');
      
      const row = [
        escapeCSVField(productInfo.goodsId),
        escapeCSVField(productInfo.productName),
        escapeCSVField(productInfo.price),
        escapeCSVField(productInfo.originalPrice),
        escapeCSVField(productInfo.sales),
        escapeCSVField(productInfo.shopName),
        escapeCSVField(productInfo.description),
        escapeCSVField(skuText),
        escapeCSVField(productInfo.mainImage),
        escapeCSVField(imagesText),
        escapeCSVField(productInfo.scrapedAt),
        escapeCSVField(productInfo.sourceUrl)
      ];
      
      const csvContent = '\uFEFF' + headers.join(',') + '\n' + row.join(',');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      log('CSV文件已下载:', `${baseName}.csv`);
      resolve();
    });
  }
  
  function escapeCSVField(field) {
    if (field === null || field === undefined) {
      return '';
    }
    
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
  
  async function downloadImageViaBackground(url, name) {
    return new Promise((resolve, reject) => {
      if (!url) {
        resolve();
        return;
      }
      
      const ext = getImageExtension(url);
      const fileName = `${name}${ext}`;
      
      log('请求下载图片:', fileName);
      
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            action: 'downloadImage',
            url: url,
            filename: `pdd_goods_images/${fileName}`
          },
          function(response) {
            if (response && response.success) {
              log('图片下载请求已发送，ID:', response.downloadId);
            } else {
              log('通过background下载失败，尝试直接下载');
              downloadImageDirect(url, fileName);
            }
            resolve();
          }
        );
      } else {
        downloadImageDirect(url, fileName);
        resolve();
      }
    });
  }
  
  function downloadImageDirect(url, fileName) {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      log('直接下载图片:', fileName);
    } catch (e) {
      log('直接下载图片失败:', e);
      
      try {
        window.open(url, '_blank');
        log('在新标签页打开图片:', url.substring(0, 50));
      } catch (e2) {
        log('打开新标签页也失败:', e2);
      }
    }
  }
  
  function getImageExtension(url) {
    if (!url) return '.jpg';
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.jpeg')) return '.jpeg';
    if (urlLower.includes('.jpg')) return '.jpg';
    if (urlLower.includes('.png')) return '.png';
    if (urlLower.includes('.gif')) return '.gif';
    if (urlLower.includes('.webp')) return '.webp';
    return '.jpg';
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  setTimeout(init, 1000);
  setTimeout(init, 3000);
  
})();
