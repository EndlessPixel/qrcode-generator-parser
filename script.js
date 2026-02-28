// 使用 IIFE 避免全局污染
(function () {
    // 等待 DOM 就绪
    document.addEventListener('DOMContentLoaded', init);

    // 缓存常用 DOM 元素
    let debugLog, debugModal, debugClose, debugBtn;
    let generateTab, parseTab;
    let qrcodeContainer, downloadBtn, parsedTextDiv, downloadFileBtn;
    let fileInput, textInput, generateFileInput;
    let toastContainer;

    // 日志数组（用于批量渲染或下载）
    let logEntries = [];
    
    // 存储解析出的DataURL内容，用于文件还原
    let parsedDataURL = null;

    // 初始化函数
    function init() {
        // 获取 DOM 元素
        debugLog = document.getElementById('debug-log');
        debugModal = document.getElementById('debug-modal');
        debugClose = document.getElementById('debug-close');
        debugBtn = document.getElementById('debug-btn');
        generateTab = document.getElementById('generate-tab');
        parseTab = document.getElementById('parse-tab');
        qrcodeContainer = document.getElementById('qrcode-container');
        downloadBtn = document.getElementById('download-btn');
        parsedTextDiv = document.getElementById('parsed-text');
        fileInput = document.getElementById('image-upload');
        textInput = document.getElementById('text-input');
        generateFileInput = document.getElementById('file-input');
        downloadFileBtn = document.getElementById('download-file-btn');
        toastContainer = document.getElementById('toast-container');

        // 初始日志
        log('用户打开了网站');
        log('正在初始化...');
        log('当前网络状态：' + (navigator.connection ? navigator.connection.effectiveType : '未知'));
        log('用户设备：' + navigator.userAgent);
        log('浏览器版本：' + navigator.appVersion);
        log('屏幕分辨率：' + window.screen.width + 'x' + window.screen.height);
        log('浏览器窗口大小：' + window.innerWidth + 'x' + window.innerHeight);
        log('初始化完成');
        log('UI界面加载完成');
        log('默认版块已成功切换到生成二维码');
        log('页面加载完成，耗时：' + performance.now() + 'ms');
        log(' ');
        log('------------------------------');
        log(' ');

        // 绑定事件
        bindEvents();
        
        // 绑定文件输入和文本输入的互斥事件
        textInput.addEventListener('input', function() {
            // 当用户输入文本时，清除文件上传
            if (generateFileInput.files.length > 0) {
                generateFileInput.value = '';
                log('用户输入文本，清除了文件上传');
            }
        });
        
        generateFileInput.addEventListener('change', function() {
            // 当用户上传文件时，清除文本输入
            if (textInput.value.trim() !== '') {
                textInput.value = '';
                log('用户上传文件，清除了文本输入');
            }
        });
        
        // 绑定文件下载按钮点击事件
        downloadFileBtn.addEventListener('click', downloadRestoredFile);

        // 绑定纠错级别选择事件
        const errorCorrectionSelect = document.getElementById('error-correction');
        if (errorCorrectionSelect) {
            errorCorrectionSelect.addEventListener('change', function() {
                const selectedLevel = this.value;
                log(`用户切换了纠错级别：${selectedLevel}`);
                showToast(`已选择纠错级别：${selectedLevel}`, 'info');
            });
        }

        // 绑定远程URL输入事件，与其他输入方式互斥
        const remoteUrlInput = document.getElementById('remote-url');
        if (remoteUrlInput) {
            remoteUrlInput.addEventListener('input', function() {
                // 当用户输入远程URL时，清除文件上传和文本输入
                if (this.value.trim() !== '') {
                    if (generateFileInput.files.length > 0) {
                        generateFileInput.value = '';
                        log('用户输入远程URL，清除了文件上传');
                    }
                    if (textInput.value.trim() !== '') {
                        textInput.value = '';
                        log('用户输入远程URL，清除了文本输入');
                    }
                }
            });
        }

        // 绑定文本输入和文件上传的互斥事件
        textInput.addEventListener('input', function() {
            // 当用户输入文本时，清除文件上传和远程URL
            if (this.value.trim() !== '') {
                if (generateFileInput.files.length > 0) {
                    generateFileInput.value = '';
                    log('用户输入文本，清除了文件上传');
                }
                if (remoteUrlInput && remoteUrlInput.value.trim() !== '') {
                    remoteUrlInput.value = '';
                    log('用户输入文本，清除了远程URL');
                }
            }
        });
        
        generateFileInput.addEventListener('change', function() {
            // 当用户上传文件时，清除文本输入和远程URL
            if (this.files.length > 0) {
                if (textInput.value.trim() !== '') {
                    textInput.value = '';
                    log('用户上传文件，清除了文本输入');
                }
                if (remoteUrlInput && remoteUrlInput.value.trim() !== '') {
                    remoteUrlInput.value = '';
                    log('用户上传文件，清除了远程URL');
                }
            }
        });

        // 绑定复制按钮点击事件
        const copyUrlBtn = document.getElementById('copy-url-btn');
        const copyImageBtn = document.getElementById('copy-image-btn');
        if (copyUrlBtn) {
            copyUrlBtn.addEventListener('click', copyQRCodeUrl);
        }
        if (copyImageBtn) {
            copyImageBtn.addEventListener('click', copyQRCodeImage);
        }

        // 确保默认显示生成选项卡，解析选项卡隐藏
        showTab('generate');
    }

    // 显示提示框的函数
    function showToast(message, type = 'info') {
        // 创建提示框元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // 添加内容
        const content = document.createElement('div');
        content.className = 'toast-content';
        content.textContent = message;
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', function() {
            toast.style.animation = 'fadeOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        });
        
        // 组装提示框
        toast.appendChild(content);
        toast.appendChild(closeBtn);
        
        // 添加到容器
        toastContainer.appendChild(toast);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'fadeOut 0.3s ease-in forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }

    // 事件绑定
    function bindEvents() {
        debugBtn.addEventListener('click', openDebugModal);
        debugClose.addEventListener('click', closeDebugModal);
        downloadBtn.addEventListener('click', downloadQRCode);
        document.getElementById('download-log-btn').addEventListener('click', downloadLog);
        document.getElementById('copy-log-btn').addEventListener('click', copyLog);
        // 模态框点击背景关闭（可选）
        debugModal.addEventListener('click', function (e) {
            if (e.target === debugModal) closeDebugModal();
        });
    }

    // 日志记录函数
    function log(message, level = 'info', error = null) {
        const now = new Date();
        const date = now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '-');
        const time = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        let logEntry = `[${date} ${time} ${level.toUpperCase()}] ${message}`;
        
        // 如果提供了错误对象，记录错误堆栈
        if (error) {
            logEntry += `\n错误详情：${error.message}`;
            if (error.stack) {
                logEntry += `\n错误堆栈：${error.stack}`;
            }
        }
        
        logEntries.push(logEntry);

        // 更新 UI（使用 HTML 元素添加颜色）
        if (debugLog) {
            const logElement = document.createElement('div');
            
            // 根据日志级别设置颜色
            let levelColor;
            switch (level.toLowerCase()) {
                case 'error':
                    levelColor = '#ff6b6b';
                    break;
                case 'warn':
                    levelColor = '#ffd93d';
                    break;
                case 'info':
                    levelColor = '#4ecdc4';
                    break;
                case 'success':
                    levelColor = '#6bcb77';
                    break;
                default:
                    levelColor = '#a0a0a0';
            }
            
            // 创建带颜色的日志元素
            let logHtml = `
                <span style="color: #888;">[${date} ${time}]</span> 
                <span style="color: ${levelColor}; font-weight: bold;">${level.toUpperCase()}</span> 
                <span style="color: #e0e0e0;">${message}</span>
            `;
            
            // 如果提供了错误对象，添加错误详情
            if (error) {
                logHtml += `
                <div style="margin-top: 4px; padding-left: 20px; color: #ff6b6b; font-size: 12px;">
                    <div>错误详情：${error.message}</div>
                    ${error.stack ? `<div style="margin-top: 2px;">错误堆栈：${error.stack}</div>` : ''}
                </div>
            `;
            }
            
            logElement.innerHTML = logHtml;
            
            debugLog.appendChild(logElement);
            // 自动滚动到底部
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }

    // 切换选项卡（使用 CSS 类）
    function showTab(tabId) {
        if (tabId === 'generate') {
            generateTab.classList.remove('hidden');
            parseTab.classList.add('hidden');
            // 更新ARIA属性
            document.getElementById('tab-generate').setAttribute('aria-selected', 'true');
            document.getElementById('tab-parse').setAttribute('aria-selected', 'false');
        } else {
            generateTab.classList.add('hidden');
            parseTab.classList.remove('hidden');
            // 更新ARIA属性
            document.getElementById('tab-generate').setAttribute('aria-selected', 'false');
            document.getElementById('tab-parse').setAttribute('aria-selected', 'true');
        }
        log('用户切换了板块：' + tabId);
    }

    // 暴露给全局的切换函数（供 onclick 使用）
    window.switchTab = showTab;

    // 打开调试模态框
    function openDebugModal() {
        log('用户点击了查看调试按钮');
        log('正在打开调试...');
        debugModal.classList.remove('hidden');
        log('调试框打开成功');
    }

    // 关闭调试模态框
    function closeDebugModal() {
        log('用户点击了关闭按钮');
        log('正在关闭调试...');
        debugModal.classList.add('hidden');
        log('调试框关闭成功');
    }

    // 读取文件内容的函数
    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                resolve(event.target.result);
            };
            reader.onerror = function() {
                reject(new Error('文件读取失败'));
            };
            
            // 对于所有文件类型，使用DataURL确保能正确处理
            reader.readAsDataURL(file);
        });
    }

    // 生成二维码（带重试机制）
    async function generateQRCode(retryCount = 0, maxRetries = 3) {
        log('用户点击了生成按钮');
        log('开始生成二维码...');

        let content = '';
        let isFileContent = false;
        
        // 检查是否有上传的文件
        const file = generateFileInput.files[0];
        const remoteUrl = document.getElementById('remote-url').value.trim();
        
        if (file) {
            // 只验证文件大小，不限制文件类型
            const maxSize = 1 * 1024 * 1024; // 1MB
            if (file.size > maxSize) {
                log('上传文件，失败：文件大小超过限制');
                showToast('文件大小不能超过1MB', 'error');
                return;
            }
            
            // 限制支持的文件类型
            const allowedTypes = [
                'text/plain',      // .txt
                'text/markdown',    // .md
                'text/html',        // .html
                'text/css',         // .css
                'text/javascript',  // .js
                'application/json', // .json
                'application/xml'   // .xml
            ];
            
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const isAllowedExtension = ['txt', 'md', 'html', 'css', 'js', 'json', 'xml'].includes(fileExtension);
            
            if (!allowedTypes.includes(file.type) && !isAllowedExtension) {
                log('上传文件，失败：文件类型不支持');
                showToast('只支持文本文件（.txt, .md, .html, .css, .js, .json, .xml）', 'error');
                return;
            }
            
            log('上传文件，成功：' + file.name);
            
            try {
                log('读取上传文件，成功');
                content = await readFileContent(file);
                isFileContent = true;
                log('文件内容读取成功');
            } catch (error) {
                log(`文件读取失败：${error.message}`);
                showToast('文件读取失败，请重试', 'error');
                return;
            }
        } else if (remoteUrl) {
            // 处理远程URL
            log('使用远程URL生成：' + remoteUrl);
            try {
                // 验证URL格式
                const urlObj = new URL(remoteUrl);
                log('URL格式验证成功：' + urlObj.href);
                
                // 检查是否使用CORS代理
                const useCorsProxy = document.getElementById('use-cors-proxy').checked;
                let requestUrl = remoteUrl;
                
                if (useCorsProxy) {
                    // 使用CORS代理服务器
                    requestUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(remoteUrl)}`;
                    log('使用CORS代理：' + requestUrl);
                }
                
                // 发起请求获取JSON数据
                log('开始发起网络请求...');
                const response = await fetch(requestUrl, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                log(`网络请求完成，状态码：${response.status}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                // 检查响应头
                const contentType = response.headers.get('content-type');
                log(`响应内容类型：${contentType}`);
                
                // 解析JSON
                log('开始解析JSON数据...');
                const jsonData = await response.json();
                log('JSON数据解析成功');
                
                // 将JSON转换为字符串
                content = JSON.stringify(jsonData);
                log('远程JSON数据获取成功，数据长度：' + content.length);
                showToast('远程JSON数据获取成功', 'success');
            } catch (error) {
                log(`远程URL处理失败：${error.message}`, 'error');
                
                // 提供更详细的错误信息和解决方案
                let errorMessage = `远程URL处理失败：${error.message}`;
                let solution = '';
                
                if (error.message === 'Failed to fetch') {
                    errorMessage = '远程URL请求失败：无法连接到服务器';
                    solution = '可能的原因：1. 网络连接问题 2. CORS跨域限制 3. 服务器未响应\n建议：尝试勾选"使用CORS代理"选项';
                } else if (error.message.includes('HTTP error')) {
                    errorMessage = `远程URL请求失败：服务器返回错误状态码`;
                    solution = '请检查URL是否正确，服务器是否正常运行';
                } else if (error.message.includes('JSON')) {
                    errorMessage = '远程URL请求失败：响应不是有效的JSON格式';
                    solution = '请确保URL返回的是有效的JSON数据';
                }
                
                showToast(`${errorMessage}\n${solution}`, 'error');
                return;
            }
        } else {
            // 使用文本输入
            content = textInput.value.trim();
            if (!content) {
                log('获取输入框文本，失败：输入框为空');
                showToast('请输入文本、上传文件或输入远程URL', 'error');
                return;
            }
            log('获取输入框文本，成功');
        }
        
        // 内容体积预估
        const contentLength = content.length;
        log(`内容长度：${contentLength} 字符`);
        
        // 二维码容量估算（基于版本40 L级纠错，约2953个字符）
        // 对于DataURL，由于base64编码，实际容量会更小
        const estimatedCapacity = isFileContent ? 1500 : 2500;
        
        if (contentLength > estimatedCapacity) {
            log('内容体积预估：过大，可能无法生成二维码');
            showToast(`内容过大，无法生成二维码\n当前长度：${contentLength} 字符\n最大支持：${estimatedCapacity} 字符`, 'error');
            return;
        }
        
        log('内容体积预估：正常，可以生成二维码');
        showToast(`内容长度：${contentLength} 字符\n预估二维码容量：正常`, 'info');

        // 清空容器并隐藏下载按钮
        qrcodeContainer.innerHTML = '';
        downloadBtn.classList.add('hidden');

        try {
            // 获取用户选择的纠错级别
            const errorCorrectionLevel = document.getElementById('error-correction').value;
            log(`使用纠错级别：${errorCorrectionLevel} 生成二维码`);
            
            // 生成二维码数据
            const qr = qrcode(0, errorCorrectionLevel);
            qr.addData(content);
            qr.make();

            const img = document.createElement('img');
            img.src = qr.createDataURL(16, 3);
            img.alt = '生成的二维码';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';

            // 等待图片加载完成
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            qrcodeContainer.appendChild(img);
            log('生成二维码，成功');

            // 自动验证：使用 jsQR 解析图片内容
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // 使用 naturalWidth 确保获取真实尺寸
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                // 对于文件内容和远程URL内容，只验证是否成功解析，不验证内容完全匹配
                // 因为文件内容是DataURL格式，远程URL内容可能有编码差异
                if (isFileContent || remoteUrl || code.data === content) {
                    log('自动解析验证成功');
                    downloadBtn.classList.remove('hidden');
                    document.getElementById('copy-url-btn').classList.remove('hidden');
                    document.getElementById('copy-image-btn').classList.remove('hidden');
                } else {
                    log('自动验证失败' + (retryCount < maxRetries ? '，准备重试...' : '，已达最大重试次数'));
                    if (retryCount < maxRetries) {
                        // 使用setTimeout避免同步递归调用
                        setTimeout(() => generateQRCode(retryCount + 1, maxRetries), 100);
                    } else {
                        qrcodeContainer.innerHTML = '<p style="color:red;">二维码生成验证失败，请重试</p>';
                    }
                }
            } else {
                log('自动验证失败' + (retryCount < maxRetries ? '，准备重试...' : '，已达最大重试次数'));
                if (retryCount < maxRetries) {
                    // 使用setTimeout避免同步递归调用
                    setTimeout(() => generateQRCode(retryCount + 1, maxRetries), 100);
                } else {
                    qrcodeContainer.innerHTML = '<p style="color:red;">二维码生成验证失败，请重试</p>';
                }
            }
        } catch (error) {
            let errorMessage = '生成二维码时出错';
            let logMessage = `生成失败：${error.message}`;
            
            // 分析错误类型，提供更具体的错误信息
            if (error.message.includes('capacity') || error.message.includes('size') || content.length > 3000) {
                errorMessage = '生成失败：文件内容超过二维码容量上限';
                logMessage = `生成失败：文件内容超过二维码容量上限，当前长度：${content.length} 字符`;
            } else if (error.message.includes('data') || error.message.includes('format')) {
                errorMessage = '生成失败：数据格式错误';
                logMessage = `生成失败：数据格式错误 - ${error.message}`;
            }
            
            log(logMessage, 'error', error);
            qrcodeContainer.innerHTML = `<p style="color:red;">${errorMessage}</p>`;
            showToast(errorMessage, 'error');
        }
    }
    window.generateQRCode = generateQRCode;

    // 下载二维码图片（由下载按钮触发）
    function downloadQRCode() {
        const img = qrcodeContainer.querySelector('img');
        if (img) {
            const url = img.src;
            const a = document.createElement('a');
            a.href = url;
            a.download = 'qrcode.png';
            a.click();
            log('用户点击了下载二维码图片按钮');
            log('下载二维码图片，成功');
        } else {
            log('下载失败：未找到二维码图片');
        }
    }

    // 解析二维码
    function parseQRCode() {
        log('用户点击了解析二维码按钮');
        log('开始解析二维码...');

        const file = fileInput.files[0];
        const imageUrl = document.getElementById('image-url').value.trim();
        parsedTextDiv.textContent = '';
        parsedDataURL = null;
        downloadFileBtn.classList.add('hidden');
        
        if (!file && !imageUrl) {
            log('上传文件，失败：未选择文件且未输入图片链接');
            showToast('请选择图片文件或输入图片链接', 'error');
            return;
        }

        if (file) {
            // 验证文件类型
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                log('上传文件，失败：文件类型不支持');
                showToast('请选择支持的图片格式（JPEG、PNG、GIF、WebP）', 'error');
                return;
            }

            // 验证文件大小（限制为5MB）
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                log('上传文件，失败：文件大小超过限制');
                showToast('图片文件大小不能超过5MB', 'error');
                return;
            }

            log('上传文件，成功');
            const reader = new FileReader();
            reader.onload = function (event) {
                log('读取文件，成功');
                processImage(event.target.result);
            };
            reader.onerror = function () {
                log('读取文件失败');
                parsedTextDiv.textContent = '文件读取失败';
            };
            reader.readAsDataURL(file);
        } else if (imageUrl) {
            // 处理图片链接（包括 data:image 链接）
            log('使用图片链接解析：' + imageUrl);
            processImage(imageUrl);
        }
    }

    // 处理图片并解析二维码
    function processImage(imageSource) {
        const img = new Image();
        img.onload = function () {
            log('加载图片，成功');
            
            // 限制图片尺寸，避免过大的图片导致性能问题
            const maxDimension = 1000;
            let width = img.width;
            let height = img.height;
            
            if (width > maxDimension || height > maxDimension) {
                const ratio = Math.min(maxDimension / width, maxDimension / height);
                width *= ratio;
                height *= ratio;
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                log('获取 canvas 上下文失败');
                parsedTextDiv.textContent = '无法创建画布上下文';
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, width, height);
            if (code) {
                log('解析二维码，成功');
                
                // 检查是否为DataURL格式
                const codeData = code.data;
                if (codeData.startsWith('data:')) {
                    log('识别到DataURL格式内容，可能是文件二维码');
                    parsedDataURL = codeData;
                    parsedTextDiv.textContent = '解析结果：文件内容（DataURL格式）';
                    downloadFileBtn.classList.remove('hidden');
                } else if (isURL(codeData)) {
                    log('识别到URL格式内容');
                    parsedTextDiv.innerHTML = `解析结果：<a href="${codeData}" target="_blank">${codeData}</a>`;
                    // 添加跳转按钮
                    const jumpBtn = document.createElement('button');
                    jumpBtn.textContent = '跳转到链接';
                    jumpBtn.style.marginLeft = '10px';
                    jumpBtn.onclick = function() {
                        window.open(codeData, '_blank');
                        log('用户点击了跳转按钮，打开链接：' + codeData);
                    };
                    parsedTextDiv.appendChild(jumpBtn);
                } else {
                    log('识别到普通文本内容');
                    parsedTextDiv.textContent = '解析结果：' + codeData;
                }
            } else {
                log('解析二维码，失败');
                parsedTextDiv.textContent = '无法解析二维码';
            }
        };
        img.onerror = function () {
            log('加载图片失败');
            parsedTextDiv.textContent = '图片加载失败';
        };
        img.src = imageSource;
    }

    // 检查字符串是否为URL
    function isURL(str) {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    }
    window.parseQRCode = parseQRCode;

    // 下载日志文件
    function downloadLog() {
        log('用户点击了下载日志文件按钮');
        const logContent = logEntries.join('\n');
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'debug-log.log';
        a.click();
        URL.revokeObjectURL(url);
        log(`日志文件下载成功，文件名：debug-log.log`);
    }

    // 复制日志内容（多种方法）
    async function copyLog() {
        try {
            log('用户点击了复制日志按钮');
            const logContent = logEntries.join('\n');
            let success = false;

            // 方法1：现代剪贴板API
            if (!success && navigator.clipboard?.writeText) {
                try {
                    await navigator.clipboard.writeText(logContent);
                    log('方法1：现代API复制成功');
                    success = true;
                } catch (error) {
                    log(`方法1失败：${error.message}`);
                }
            }

            // 方法2：传统 execCommand
            if (!success) {
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = logContent;
                    textArea.style.position = 'fixed';
                    textArea.style.opacity = '0';
                    textArea.style.pointerEvents = 'none';
                    document.body.appendChild(textArea);
                    
                    // 确保文本被选中
                    textArea.select();
                    textArea.setSelectionRange(0, logContent.length);
                    
                    const result = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    if (result) {
                        log('方法2：execCommand复制成功');
                        success = true;
                    } else {
                        throw new Error('execCommand返回失败');
                    }
                } catch (error) {
                    log(`方法2失败：${error.message}`);
                }
            }

            // 方法3：ClipboardItem API
            if (!success && navigator.clipboard?.write) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'text/plain': new Blob([logContent], { type: 'text/plain' })
                        })
                    ]);
                    log('方法3：ClipboardItem API复制成功');
                    success = true;
                } catch (error) {
                    log(`方法3失败：${error.message}`);
                }
            }

            // 回退方案：手动选中
            if (!success) {
                log('所有自动方法失败，启用回退方案');
                // 保存原始 contentEditable 状态
                const originalEditable = debugLog.contentEditable;
                debugLog.contentEditable = 'true';
                debugLog.focus();

                // 选中全部内容
                const range = document.createRange();
                range.selectNodeContents(debugLog);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);

                showToast('⚠️ 请手动按 Ctrl+C 复制选中内容', 'info');

                // 恢复 contentEditable（延迟一点，避免干扰复制操作）
                setTimeout(() => {
                    debugLog.contentEditable = originalEditable;
                }, 100);
                success = true; // 认为用户手动复制成功
            }

            if (success) {
                showToast('✅ 复制成功！', 'success');
                log('用户收到成功提示');
            }
        } catch (error) {
            log(`全局捕获异常：${error.message}`);
            showToast('❌ 复制过程中发生意外错误', 'error');
        }
    }

    // 下载还原文件
    function downloadRestoredFile() {
        if (!parsedDataURL) {
            log('下载失败：未找到解析的文件内容');
            showToast('未找到可下载的文件内容', 'error');
            return;
        }

        log('用户点击了下载还原文件按钮');
        
        try {
            // 从DataURL中提取信息
            const dataURLParts = parsedDataURL.split(',');
            if (dataURLParts.length < 2) {
                throw new Error('无效的DataURL格式');
            }
            
            const metadata = dataURLParts[0];
            const base64Content = dataURLParts[1];
            
            // 提取MIME类型
            const mimeMatch = metadata.match(/data:(.+?);base64/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
            
            // 解码Base64内容
            try {
                const byteCharacters = atob(base64Content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                
                // 创建Blob对象
                const blob = new Blob([byteArray], { type: mimeType });
                const url = URL.createObjectURL(blob);
                
                // 生成文件名
                const extension = getFileExtensionFromMimeType(mimeType);
                const fileName = `restored-file${extension}`;
                
                // 创建下载链接
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                
                // 清理
                URL.revokeObjectURL(url);
                
                log(`文件下载成功，文件名：${fileName}，MIME类型：${mimeType}`);
                showToast(`文件下载成功！\n文件名：${fileName}\n文件类型：${mimeType}`, 'success');
            } catch (decodeError) {
                throw new Error('Base64解码失败：' + decodeError.message);
            }
        } catch (error) {
            log(`文件下载失败：${error.message}`);
            showToast(`文件下载失败：${error.message}\n请重试或检查二维码内容是否正确`, 'error');
        }
    }

    // 复制二维码URL
    function copyQRCodeUrl() {
        const img = qrcodeContainer.querySelector('img');
        if (img) {
            const url = img.src;
            navigator.clipboard.writeText(url)
                .then(() => {
                    log('复制二维码URL成功');
                    showToast('二维码URL已复制到剪贴板', 'success');
                })
                .catch(err => {
                    log(`复制二维码URL失败：${err.message}`, 'error');
                    showToast('复制失败，请手动复制', 'error');
                });
        } else {
            log('复制失败：未找到二维码图片');
            showToast('未找到二维码图片', 'error');
        }
    }

    // 复制二维码图片
    function copyQRCodeImage() {
        const img = qrcodeContainer.querySelector('img');
        if (img) {
            // 创建canvas元素
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // 尝试复制图片到剪贴板
            canvas.toBlob(blob => {
                try {
                    const item = new ClipboardItem({ 'image/png': blob });
                    navigator.clipboard.write([item])
                        .then(() => {
                            log('复制二维码图片成功');
                            showToast('二维码图片已复制到剪贴板', 'success');
                        })
                        .catch(err => {
                            log(`复制二维码图片失败：${err.message}`, 'error');
                            showToast('复制失败，请手动复制', 'error');
                        });
                } catch (error) {
                    log(`复制二维码图片失败：${error.message}`, 'error');
                    showToast('复制失败，请手动复制', 'error');
                }
            });
        } else {
            log('复制失败：未找到二维码图片');
            showToast('未找到二维码图片', 'error');
        }
    }

    // 根据MIME类型获取文件扩展名
    function getFileExtensionFromMimeType(mimeType) {
        const mimeToExt = {
            'text/plain': '.txt',
            'text/html': '.html',
            'text/css': '.css',
            'text/javascript': '.js',
            'application/json': '.json',
            'application/xml': '.xml',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'application/pdf': '.pdf',
            'application/zip': '.zip'
        };
        
        return mimeToExt[mimeType] || '.bin';
    }
})();