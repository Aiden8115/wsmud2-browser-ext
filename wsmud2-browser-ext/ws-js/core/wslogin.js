// wslogin.js
// 一键登录助手：保存账号/区服/角色信息，自动完成登录流程。
(function () {
    "use strict";

    const AccountHelper = {
        accountData: {},
        currentAccount: null,
        currentServerName: null,
        storageKey: "mud_game_account_data",
        isButtonInjected: false,

        // 密码加密：每个字符转两位 hex，整体循环右移 1 位后再 base64
        encryptPassword: function (password) {
            let hexString = "";
            for (let i = 0; i < password.length; i++) {
                const hex = password.charCodeAt(i).toString(16);
                hexString += ("0" + hex).slice(-2);
            }
            const shiftedHex = hexString.slice(-1) + hexString.slice(0, -1);
            return btoa(shiftedHex);
        },

        // 密码解密：加密的逆过程
        decryptPassword: function (encoded) {
            try {
                const shiftedHex = atob(encoded);
                const hexString = shiftedHex.slice(1) + shiftedHex.slice(0, 1);
                let password = "";
                for (let i = 0; i < hexString.length; i += 2) {
                    const hexPair = hexString.substr(i, 2);
                    const charCode = parseInt(hexPair, 16);
                    password += String.fromCharCode(charCode);
                }
                return password;
            } catch (e) {
                console.error("密码解密失败:", e);
                return null;
            }
        },

        init: function () {
            this.loadData();
            this.injectLoginDialog();
            this.bindPanelEvents();
            this.bindLoginCapture();
            this.waitForWGAndHook();
        },

        loadData: function () {
            const savedData = localStorage.getItem(this.storageKey);
            if (savedData) this.accountData = JSON.parse(savedData);
        },

        saveData: function () {
            localStorage.setItem(this.storageKey, JSON.stringify(this.accountData));
            this.populateAccountsDropdown();
        },

        sleep: function (ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        },

        // 注入登录弹窗 DOM 与样式
        injectLoginDialog: function () {
            const dialogHTML = `
                <div id="wsmud-login-overlay" class="wsmud-login-overlay hide">
                    <div id="wsmud-login-dialog-container" class="wsmud-login-dialog">
                        <div class="wsmud-login-dialog-header">
                            <span class="wsmud-login-dialog-title">一键登录助手</span>
                            <span class="wsmud-login-dialog-close glyphicon glyphicon-remove-circle"></span>
                        </div>
                        <div class="wsmud-login-dialog-content">
                            <h3>选择已保存的账号</h3>
                            <select id="wsmud-login-accounts" class="wsmud-login-select"><option value="">--请选择账号--</option></select>
                            <h3>选择区服</h3>
                            <select id="wsmud-login-servers" class="wsmud-login-select" disabled><option value="">--请选择区服--</option></select>
                            <h3>选择角色</h3>
                            <select id="wsmud-login-roles" class="wsmud-login-select" disabled><option value="">--请选择角色--</option></select>
                            <div id="wsmud-login-status"></div>
                            <div id="wsmud-login-btn">
                                <span class="glyphicon glyphicon-flash"></span>
                                <span style="margin-left:0.5rem">立即登录</span>
                            </div>
                            <!-- 新增版本标识，提升辨识度 -->
                            <div class="wsmud-login-version">v4.2</div>
                        </div>
                    </div>
                </div>
            `;
            $("body").append(dialogHTML);

            const customCSS = `
                /* 遮罩层优化：过渡更柔和，避免生硬切换 */
                .wsmud-login-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background-color: rgba(0, 0, 0, 0.7); z-index: 9998;
                    display: flex; justify-content: center; align-items: center;
                    transition: opacity 0.3s ease; opacity: 0; pointer-events: none;
                }
                .wsmud-login-overlay:not(.hide) { opacity: 1; pointer-events: auto; }

                /* 弹窗优化：增加圆角层次，阴影更立体，背景适配游戏暗黑风格 */
                @keyframes wsmud-login-fadein {
                    from { opacity: 0; transform: scale(0.92) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .wsmud-login-dialog {
                    width: 340px; max-width: 92%; background-color: #1f2937;
                    border: 1px solid #374151; box-shadow: 0 8px 32px rgba(0,0,0,0.6); color: #f3f4f6;
                    border-radius: 12px; animation: wsmud-login-fadein 0.3s ease-out;
                    overflow: hidden; /* 确保圆角裁切生效 */
                }

                /* 弹窗头部：增加下边框阴影，提升分隔感 */
                .wsmud-login-dialog-header {
                    padding: 14px 20px; background-color: #2d3748; border-bottom: 1px solid #374151;
                    position: relative; font-weight: 600; font-size: 16px;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.4);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1) inset;
                }

                /* 关闭按钮：增加hover动画，反馈更清晰 */
                .wsmud-login-dialog-close {
                    position: absolute; top: 50%; right: 20px; transform: translateY(-50%);
                    cursor: pointer; font-size: 1.4em; color: #9ca3af;
                    transition: color 0.2s ease, transform 0.2s ease;
                }
                .wsmud-login-dialog-close:hover {
                    color: #f87171; transform: translateY(-50%) rotate(9deg);
                }

                /* 弹窗内容：增加内边距，调整间距，提升呼吸感 */
                .wsmud-login-dialog-content {
                    padding: 20px; display: flex; flex-direction: column; gap: 12px;
                }
                .wsmud-login-dialog-content h3 {
                    margin: 6px 0 4px; font-size: 14px; color: #9ca3af;
                    font-weight: 500;
                }

                /* 下拉框优化：增加hover/focus状态的渐变背景，禁用时样式更友好 */
                .wsmud-login-select {
                    width: 100%; padding: 10px 12px; background-color: #2d3748; color: #f3f4f6;
                    border: 1px solid #374151; border-radius: 8px; box-sizing: border-box;
                    transition: all 0.25s ease; font-size: 14px;
                    appearance: none; /* 清除默认下拉样式 */
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M8 11l4-4H4l4 4z'/%3E%3C/svg%3E");
                    background-repeat: no-repeat; background-position: right 12px center;
                }
                .wsmud-login-select:hover {
                    border-color: #60a5fa; background-color: #374151;
                }
                .wsmud-login-select:focus {
                    outline: none; border-color: #60a5fa;
                    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
                }
                .wsmud-login-select:disabled {
                    background-color: #262f3f; color: #6b7280;
                    border-color: #374151; cursor: not-allowed;
                }

                /* 状态提示：增加内边距，优化文字排版 */
                #wsmud-login-status {
                    margin-top: 8px; font-size: 13px; text-align: center;
                    min-height: 18px; padding: 4px 0;
                }

                /* 登录按钮：渐变背景，hover/active状态强化，增加加载预留空间 */
                #wsmud-login-btn {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: #ffffff; text-align: center;
                    padding: 12px 15px; border-radius: 8px; cursor: pointer;
                    font-weight: 600; margin-top: 12px;
                    transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                    display: flex; justify-content: center; align-items: center;
                }
                #wsmud-login-btn:hover {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
                }
                #wsmud-login-btn:active {
                    transform: scale(0.97); box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
                }
                /* 登录中状态（预留，配合后续交互） */
                #wsmud-login-btn.loading {
                    background: linear-gradient(135deg, #4b5563, #374151);
                    cursor: not-allowed;
                }

                /* 版本标识：弱化样式，避免干扰主操作 */
                .wsmud-login-version {
                    margin-top: 10px; font-size: 12px; color: #6b7280;
                    text-align: center;
                }

                /* 注入按钮优化：与游戏原有面板样式统一，增加hover高亮 */
                /*.panel_item[command="ShowLoginDialog"] {
                    transition: background-color 0.2s ease, color 0.2s ease;
                }
                */
                .panel_item[command="ShowLoginDialog"] {
                  color:orange;
                  padding: 10px 0 10px 10px;
                  text-shadow: 0 0 15px;
                  transition: background-color 0.2s ease, color 0.2s ease;
                }
                .panel_item[command="ShowLoginDialog"]:hover {
                    background-color: rgba(96, 165, 250, 0.1);
                    color: #60a5fa;
                }
            `;
            $("head").append(`<style>${customCSS}</style>`);
            this.populateAccountsDropdown();
        },

        // 在角色面板的"删除角色"按钮之后插入"一键登录"按钮
        injectAssistantButton: function () {
            if (this.isButtonInjected) return;

            const $deleteButton = $('#role_panel ul li[command="DeleteRole"]');
            if ($deleteButton.length > 0) {
                const assistantButtonHTML = `
                    <li class="panel_item" command="ShowLoginDialog">
                            <span class="glyphicon glyphicon-user"></span>
                            <span style="margin-left:0.5rem">一键登录</span>
                        </li>`;
                $deleteButton.after(assistantButtonHTML);
                this.isButtonInjected = true;
            }
        },

        // 绑定面板与登录弹窗的事件
        bindPanelEvents: function () {
            // 点击"一键登录"按钮显示弹窗
            $(document).on("click", ".panel_item[command]", function () {
                const command = $(this).attr("command");
                if (command === "ShowLoginDialog") {
                    $("#wsmud-login-overlay").removeClass("hide");
                }
            });

            // 点击关闭按钮或遮罩层关闭弹窗
            $(document).on("click", ".wsmud-login-dialog-close, #wsmud-login-overlay", function (e) {
                if (e.target === this) {
                    $("#wsmud-login-overlay").addClass("hide");
                }
            });

            // 阻止点击弹窗内容区域时事件冒泡到遮罩层
            $(document).on("click", "#wsmud-login-dialog-container", function (e) {
                e.stopPropagation();
            });

            $("#wsmud-login-accounts").on("change", (e) => this.handleAccountChange(e));
            $("#wsmud-login-servers").on("change", (e) => this.handleServerChange(e));
            $("#wsmud-login-btn").on("click", () => this.handleAutoLogin());

            $(".wsmud-login-select").on("focus", function () {
                $(this).addClass("focused");
            }).on("blur", function () {
                $(this).removeClass("focused");
            });
        },

        // 重新填充账号下拉框，并重置区服/角色下拉框
        populateAccountsDropdown: function () {
            const $select = $("#wsmud-login-accounts")
                .empty()
                .append('<option value="">--请选择账号--</option>');
            for (const account in this.accountData) {
                $select.append(`<option value="${account}">${account}</option>`);
            }
            this.resetDropdowns(["#wsmud-login-servers", "#wsmud-login-roles"]);
        },

        // 账号切换：填充对应的区服列表
        handleAccountChange: function (e) {
            const account = $(e.target).val();
            this.resetDropdowns(["#wsmud-login-servers", "#wsmud-login-roles"]);
            if (!account) return;

            const servers = Object.keys(this.accountData[account]).filter((k) => k !== "password");
            const $serverSelect = $("#wsmud-login-servers");
            if (servers.length > 0) {
                servers.forEach((server) => $serverSelect.append(`<option value="${server}">${server}</option>`));
                $serverSelect.prop("disabled", false);
                $serverSelect.css("opacity", 0.6).animate({ opacity: 1 }, 200);
                $serverSelect.prop("selectedIndex", 1).trigger("change");
            }
        },

        // 区服切换：填充对应的角色列表
        handleServerChange: function (e) {
            const server = $(e.target).val();
            const account = $("#wsmud-login-accounts").val();
            this.resetDropdowns(["#wsmud-login-roles"]);
            if (!server || !account) return;

            const roles = this.accountData[account][server]?.roles || [];
            const $roleSelect = $("#wsmud-login-roles");
            if (roles.length > 0) {
                roles.forEach((role) => $roleSelect.append(`<option value="${role.id}">${role.name} (${role.title})</option>`));
                $roleSelect.prop("disabled", false);
                $roleSelect.css("opacity", 0.6).animate({ opacity: 1 }, 200);
                $roleSelect.prop("selectedIndex", 1);
            }
        },

        // 重置指定下拉框为初始状态
        resetDropdowns: function (selectors) {
            selectors.forEach((selector) => {
                $(selector).empty().append('<option value="">--请选择--</option>').prop("disabled", true);
                $(selector).css("opacity", 1);
            });
        },

        // 更新登录状态提示
        updateStatus: function (message, isError = false) {
            const $status = $("#wsmud-login-status");
            $status.text(message).css("color", isError ? "#f87171" : "#f59e0b");
            $status.css("opacity", 0.6).animate({ opacity: 1 }, 200);
        },

        // 必要时返回到登录界面
        ensureLoginScreen: async function () {
            this.updateStatus("需要切换账号，正在返回登录界面...");
            if ($("#login_panel").is(":visible")) {
                this.updateStatus("已在登录界面。");
                return;
            }
            if ($("#role_panel").is(":visible")) {
                $('.panel_item[command="ToServerPanel"]').click();
                await this.waitForElementVisible("#slist_panel", 5e3);
            }
            if ($("#slist_panel").is(":visible")) {
                if (typeof unsafeWindow.CloseServer === "function") unsafeWindow.CloseServer();
                $('.panel_item[command="ReLogin"]').click();
                await this.waitForElementVisible("#login_panel", 5e3);
            }
            this.updateStatus("已成功返回登录界面。");
        },

        // 自动登录主流程
        handleAutoLogin: async function () {
            const account = $("#wsmud-login-accounts").val();
            const server = $("#wsmud-login-servers").val();
            const roleId = $("#wsmud-login-roles").val();
            if (!account || !server || !roleId) {
                this.updateStatus("请选择完整的账号、区服和角色！", true);
                return;
            }

            $("#wsmud-login-overlay").addClass("hide");
            const $loginBtn = $("#wsmud-login-btn");
            const resetBtn = () => $loginBtn.removeClass("loading")
                .html('<span class="glyphicon glyphicon-flash"></span><span style="margin-left:0.5rem">立即登录</span>');
            $loginBtn.addClass("loading")
                .html('<span class="glyphicon glyphicon-spinner glyphicon-spin"></span><span style="margin-left:0.5rem">登录中...</span>');

            // 当前账号和区服已选中，直接选择角色
            if (this.currentAccount === account && this.currentServerName === server) {
                try {
                    this.updateStatus("账号服务器匹配，直接登录角色...");
                    await this.sleep(500);
                    $(`.role-list li[roleid="${roleId}"]`).click();
                    await this.sleep(500);
                    $('.panel_item[command="SelectRole"]').click();
                    this.updateStatus("登录指令已发送！");
                } catch (error) {
                    this.updateStatus(`错误: ${error}`, true);
                } finally {
                    resetBtn();
                }
                return;
            }

            // 切换账号：需要重新走完整登录流程
            const encodedPassword = this.accountData[account].password;
            if (!encodedPassword) {
                this.updateStatus("未找到该账号的密码！", true);
                resetBtn();
                return;
            }
            const password = this.decryptPassword(encodedPassword);
            if (password === null) {
                this.updateStatus("密码解密失败，数据可能已损坏！", true);
                resetBtn();
                return;
            }

            try {
                await this.ensureLoginScreen();
                this.updateStatus("步骤1/3: 正在登录账号...");
                $("#login_name").val(account);
                $("#login_pwd").val(password);
                $('.panel_item[command="LoginIn"]').click();
                await this.waitForElementVisible("#slist_panel", 1e4);

                this.updateStatus("步骤2/3: 正在选择区服...");
                $(".server-list li").filter(function () {
                    return $(this).text().trim() === server;
                }).click();
                $('.panel_item[command="SelectServer"]').click();
                await this.waitForElementVisible("#role_panel", 1e4);

                this.updateStatus("步骤3/3: 正在选择角色...");
                await this.sleep(500);
                $(`.role-list li[roleid="${roleId}"]`).click();
                await this.sleep(500);
                $('.panel_item[command="SelectRole"]').click();
                this.updateStatus("登录指令已发送！");
            } catch (error) {
                this.updateStatus(`错误: ${error}`, true);
            } finally {
                resetBtn();
            }
        },

        // 轮询等待元素可见
        waitForElementVisible: function (selector, timeout) {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const interval = setInterval(() => {
                    const $element = $(selector);
                    if ($element.is(":visible")) {
                        clearInterval(interval);
                        resolve();
                    } else if (Date.now() - startTime > timeout) {
                        clearInterval(interval);
                        reject(`操作超时: 等待 ${selector} 失败`);
                    }
                }, 200);
            });
        },

        // 捕获用户手动登录动作，保存账号和密码
        bindLoginCapture: function () {
            $(document).on("click", '.panel_item[command="LoginIn"]', () => {
                const username = $("#login_name").val().trim().toLowerCase();
                const password = $("#login_pwd").val();
                if (!username || !password) return;
                this.currentAccount = username;
                if (!this.accountData[username]) this.accountData[username] = {};
                this.accountData[username].password = this.encryptPassword(password);
                this.saveData();
            });
        },

        // 等待 WG 全局对象就绪并挂载 hook，同时通过备用轮询注入按钮
        waitForWGAndHook: function () {
            const fallbackInterval = setInterval(() => {
                this.injectAssistantButton();
                if (this.isButtonInjected) {
                    clearInterval(fallbackInterval);
                }
            }, 500);

            setTimeout(() => {
                clearInterval(fallbackInterval);
                if (!this.isButtonInjected) {
                    console.error("MUD登录助手：备用轮询超时，未能注入按钮。");
                }
            }, 1e4);

            const hookInterval = setInterval(() => {
                if (unsafeWindow.WG && typeof unsafeWindow.WG.add_hook === "function") {
                    clearInterval(hookInterval);

                    // 接收区服角色列表，保存到当前账号+区服下
                    unsafeWindow.WG.add_hook("roles", (data) => {
                        setTimeout(() => {
                            this.injectAssistantButton();
                        }, 100);

                        if (!this.currentAccount) {
                            const lastLogin = localStorage.getItem("login_name");
                            if (lastLogin) this.currentAccount = lastLogin.toLowerCase();
                            else return;
                        }

                        const serverElement = $(".server-list > li.select");
                        if (serverElement.length === 0) return;
                        this.currentServerName = serverElement.text().trim();

                        if (!this.accountData[this.currentAccount][this.currentServerName]) {
                            this.accountData[this.currentAccount][this.currentServerName] = {};
                        }
                        this.accountData[this.currentAccount][this.currentServerName].roles = data.roles;
                        this.saveData();
                    });

                    // 登录成功后记录最后登录的角色
                    unsafeWindow.WG.add_hook("login", (data) => {
                        if (!this.currentAccount || !this.currentServerName) return;
                        const serverInfo = this.accountData[this.currentAccount][this.currentServerName];
                        if (serverInfo && serverInfo.roles) {
                            const loggedInRole = serverInfo.roles.find((role) => role.id === data.id);
                            if (loggedInRole) serverInfo.lastLoggedInRole = loggedInRole;
                        }
                        this.saveData();
                        this.currentServerName = null;
                    });
                }
            }, 500);
        }
    };

    AccountHelper.init();
})();
