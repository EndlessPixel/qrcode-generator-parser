// 使用 IIFE 避免全局污染
(function () {
    // 等待 DOM 就绪
    document.addEventListener('DOMContentLoaded', init);

    // 缓存常用 DOM 元素
    let debugLog, debugModal, debugClose, debugBtn;
    let generateTab, parseTab;
    let qrcodeContainer, downloadBtn, parsedTextDiv;
    let fileInput, textInput;

    // 日志数组（用于批量渲染或下载）
    let logEntries = [];

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

        // 确保默认显示生成选项卡，解析选项卡隐藏
        showTab('generate');
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
    function log(message) {
        const now = new Date();
        const timestamp = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/\//g, '-');

        const logEntry = `[${timestamp}] ${message}`;
        logEntries.push(logEntry);

        // 更新 UI（使用 insertAdjacentText 避免完全替换）
        if (debugLog) {
            debugLog.insertAdjacentText('beforeend', logEntry + '\n');
            // 自动滚动到底部
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }

    // 切换选项卡（使用 CSS 类）
    function showTab(tabId) {
        if (tabId === 'generate') {
            generateTab.classList.remove('hidden');
            parseTab.classList.add('hidden');
        } else {
            generateTab.classList.add('hidden');
            parseTab.classList.remove('hidden');
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

    // 生成二维码（带重试机制）
    async function generateQRCode(retryCount = 0, maxRetries = 3) {
        log('用户点击了生成按钮');
        log('开始生成二维码...');

        const text = textInput.value.trim();
        if (!text) {
            log('获取输入框文本，失败：输入框为空');
            alert('请输入文本');
            return;
        }
        log('获取输入框文本，成功');

        // 清空容器并隐藏下载按钮
        qrcodeContainer.innerHTML = '';
        downloadBtn.classList.add('hidden');

        try {
            // 生成二维码数据
            const qr = qrcode(0, 'H');
            qr.addData(text);
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

            if (code && code.data === text) {
                log('自动解析验证成功');
                downloadBtn.classList.remove('hidden');
            } else {
                log('自动验证失败' + (retryCount < maxRetries ? '，准备重试...' : '，已达最大重试次数'));
                if (retryCount < maxRetries) {
                    // 递归重试（但避免无限递归）
                    generateQRCode(retryCount + 1, maxRetries);
                } else {
                    qrcodeContainer.innerHTML = '<p style="color:red;">二维码生成验证失败，请重试</p>';
                }
            }
        } catch (error) {
            log(`生成失败：${error.message}`);
            qrcodeContainer.innerHTML = '<p style="color:red;">生成二维码时出错</p>';
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
        parsedTextDiv.textContent = '';
        if (!file) {
            log('上传文件，失败：未选择文件');
            alert('请选择图片文件');
            return;
        }

        log('上传文件，成功');
        const reader = new FileReader();
        reader.onload = function (event) {
            log('读取文件，成功');
            const img = new Image();
            img.onload = function () {
                log('加载图片，成功');
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    log('获取 canvas 上下文失败');
                    parsedTextDiv.textContent = '无法创建画布上下文';
                    return;
                }
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                    log('解析二维码，成功');
                    parsedTextDiv.textContent = '解析结果：' + code.data;
                } else {
                    log('解析二维码，失败');
                    parsedTextDiv.textContent = '无法解析二维码';
                }
            };
            img.onerror = function () {
                log('加载图片失败');
                parsedTextDiv.textContent = '图片加载失败';
            };
            img.src = event.target.result;
        };
        reader.onerror = function () {
            log('读取文件失败');
            parsedTextDiv.textContent = '文件读取失败';
        };
        reader.readAsDataURL(file);
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
                    document.body.appendChild(textArea);
                    textArea.select();
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

                alert('⚠️ 请手动按 Ctrl+C 复制选中内容');

                // 恢复 contentEditable（延迟一点，避免干扰复制操作）
                setTimeout(() => {
                    debugLog.contentEditable = originalEditable;
                }, 100);
                success = true; // 认为用户手动复制成功
            }

            if (success) {
                alert('✅ 复制成功！');
                log('用户收到成功提示');
            }
        } catch (error) {
            log(`全局捕获异常：${error.message}`);
            alert('❌ 复制过程中发生意外错误');
        }
    }
})();