(function() {
  'use strict';
  
  let floatBtn = null;
  let progressDiv = null;
  let isScraping = false;
  
  function init() {
    createFloatButton();
    createProgressDiv();
    console.log('拼多多商品采集助手已初始化');
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
  }
  
  function hideProgress() {
    setTimeout(function() {
      progressDiv.classList.remove('show');
    }, 3000);
  }
  
  async function handleScrape() {
    if (isScraping) return;
    
    isScraping = true;
    floatBtn.classList.add('loading');
    showProgress('正在采集商品信息，请稍候...');
    
    try {
      const productInfo = await scrapeProductInfo();
      
      if (productInfo) {
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
        throw new Error('未能采集到商品信息');
      }
    } catch (error) {
      console.error('采集失败:', error);
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
      scrapedAt: new Date().toISOString()
    };
    
    productInfo.productName = extractProductName();
    productInfo.price = extractPrice();
    productInfo.originalPrice = extractOriginalPrice();
    productInfo.sales = extractSales();
    productInfo.description = extractDescription();
    productInfo.skus = extractSkus();
    productInfo.mainImage = extractMainImage();
    productInfo.images = extractImages();
    productInfo.shopName = extractShopName();
    
    console.log('采集到的商品信息:', productInfo);
    return productInfo;
  }
  
  function getGoodsIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('goods_id') || 'unknown';
  }
  
  function extractProductName() {
    const selectors = [
      '.goods-title',
      '.title',
      '[class*="title"]',
      '[class*="goods-title"]',
      'h1',
      'h2'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.trim();
        if (text && text.length > 5 && text.length < 200) {
          return text.replace(/[\n\r]/g, ' ');
        }
      }
    }
    
    return '';
  }
  
  function extractPrice() {
    const selectors = [
      '[class*="price"]',
      '[class*="Price"]',
      '.price',
      '.Price'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.trim();
        const priceMatch = text.match(/(\d+\.?\d*)/);
        if (priceMatch && parseFloat(priceMatch[1]) > 0) {
          return priceMatch[1];
        }
      }
    }
    
    return '';
  }
  
  function extractOriginalPrice() {
    const selectors = [
      '[class*="original"]',
      '[class*="Original"]',
      '[class*="line-through"]',
      '[class*="del"]',
      'del',
      's'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.trim();
        const priceMatch = text.match(/(\d+\.?\d*)/);
        if (priceMatch && parseFloat(priceMatch[1]) > 0) {
          return priceMatch[1];
        }
      }
    }
    
    return '';
  }
  
  function extractSales() {
    const salesPatterns = [
      /已拼(\d+)件/,
      /已售(\d+)件/,
      /销量[：:]\s*(\d+)/,
      /(\d+)\s*件[已售]/,
      /(\d+\.?\d*万?)\+?\s*件/
    ];
    
    const textContent = document.body.textContent;
    
    for (const pattern of salesPatterns) {
      const match = textContent.match(pattern);
      if (match) {
        let sales = match[1];
        if (sales.includes('万')) {
          sales = parseFloat(sales) * 10000;
        }
        return String(sales);
      }
    }
    
    return '';
  }
  
  function extractDescription() {
    const selectors = [
      '[class*="desc"]',
      '[class*="Desc"]',
      '[class*="detail"]',
      '[class*="Detail"]',
      '.description',
      '.desc'
    ];
    
    let description = '';
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.trim();
        if (text && text.length > 20 && text.length < 2000) {
          description = text.replace(/[\n\r\t]/g, ' ').substring(0, 500);
          break;
        }
      }
      if (description) break;
    }
    
    return description;
  }
  
  function extractSkus() {
    const skus = [];
    
    const skuSelectors = [
      '[class*="sku"]',
      '[class*="Sku"]',
      '[class*="spec"]',
      '[class*="Spec"]',
      '[class*="option"]',
      '[class*="Option"]'
    ];
    
    const skuTexts = new Set();
    
    for (const selector of skuSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.trim();
        if (text && text.length > 1 && text.length < 50 && !skuTexts.has(text)) {
          skuTexts.add(text);
          skus.push({
            name: text,
            price: '',
            stock: ''
          });
        }
      }
    }
    
    return skus.slice(0, 10);
  }
  
  function extractMainImage() {
    const imgSelectors = [
      '[class*="main"] img',
      '[class*="Main"] img',
      '.goods-img img',
      '.goods-image img',
      '[class*="goods-img"] img',
      '[class*="goods-image"] img',
      'img[src*="pddpic"]'
    ];
    
    for (const selector of imgSelectors) {
      const img = document.querySelector(selector);
      if (img && img.src) {
        const src = img.src;
        if (src.includes('pddpic') && !src.includes('thumb') && !src.includes('thumbnail')) {
          return cleanImageUrl(src);
        }
      }
    }
    
    const allImages = document.querySelectorAll('img');
    for (const img of allImages) {
      const src = img.src || img.dataset.src;
      if (src && src.includes('pddpic')) {
        return cleanImageUrl(src);
      }
    }
    
    return '';
  }
  
  function extractImages() {
    const images = [];
    const imageUrls = new Set();
    
    const allImages = document.querySelectorAll('img');
    for (const img of allImages) {
      const src = img.src || img.dataset.src;
      if (src && src.includes('pddpic') && !src.includes('thumb') && !src.includes('thumbnail')) {
        const cleanUrl = cleanImageUrl(src);
        if (!imageUrls.has(cleanUrl)) {
          imageUrls.add(cleanUrl);
          images.push(cleanUrl);
        }
      }
    }
    
    return images.slice(0, 20);
  }
  
  function cleanImageUrl(url) {
    let cleanUrl = url;
    
    const sizePatterns = [
      /\?imageMogr2.*$/,
      /\?.+$/,
      /\.(jpeg|jpg|png|gif|webp)\.a\.(jpeg|jpg|png|gif|webp)$/i
    ];
    
    for (const pattern of sizePatterns) {
      cleanUrl = cleanUrl.replace(pattern, '');
    }
    
    return cleanUrl;
  }
  
  function extractShopName() {
    const selectors = [
      '[class*="shop"]',
      '[class*="Shop"]',
      '[class*="store"]',
      '[class*="Store"]',
      '.shop-name',
      '.store-name'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.trim();
        if (text && text.length > 2 && text.length < 50 && !text.includes('收藏') && !text.includes('关注')) {
          return text;
        }
      }
    }
    
    return '';
  }
  
  async function saveProductData(productInfo) {
    const timestamp = new Date().getTime();
    const safeProductName = sanitizeFileName(productInfo.productName || 'product');
    const baseName = `${productInfo.goodsId}_${safeProductName.substring(0, 30)}_${timestamp}`;
    
    await downloadCSV(productInfo, baseName);
    
    if (productInfo.mainImage) {
      await downloadImage(productInfo.mainImage, `${baseName}_主图`);
    }
    
    for (let i = 0; i < productInfo.images.length && i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await downloadImage(productInfo.images[i], `${baseName}_图片${i + 1}`);
    }
  }
  
  function sanitizeFileName(name) {
    return name
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/[\r\n\t]/g, '')
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
        escapeCSVField(window.location.href)
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
      
      console.log('CSV已下载');
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
  
  function downloadImage(url, name) {
    return new Promise((resolve, reject) => {
      if (!url) {
        resolve();
        return;
      }
      
      const ext = getImageExtension(url);
      const fileName = `${name}${ext}`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('图片下载请求已发送:', fileName);
      resolve();
    });
  }
  
  function getImageExtension(url) {
    if (url.includes('.jpeg')) return '.jpeg';
    if (url.includes('.jpg')) return '.jpg';
    if (url.includes('.png')) return '.png';
    if (url.includes('.gif')) return '.gif';
    if (url.includes('.webp')) return '.webp';
    return '.jpg';
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  setTimeout(init, 1000);
  
})();
