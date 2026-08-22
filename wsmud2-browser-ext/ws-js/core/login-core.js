// ============================================================
// login-core.js —— 登录/注册/选服逻辑
// ------------------------------------------------------------
// 从 ws.js 拆出来的账号流程：
//   LoginMethods  登录面板各按钮的方法集（登录/注册/改密/绑手机）
//   LoginCommand  登录面板的命令分发
//   CheckLogin    校验登录状态
//   SendValidateCode 发送手机验证码
//   SetCookie     保存登录凭证
// 全局变量：GameClient（客户端实例）、SelectedServer（当前选中区服）、
//           SERVERS（区服列表）、screenTop
// 想改：注册时的用户名正则、角色属性范围（15-30、总和80）→ 在本文件搜索。
// ============================================================
'use strict';

// login-core.js — 登录逻辑（从 ws.js 提取），包含登录、注册、选服、角色管理等。

let GameClient, SelectedServer, screenTop = 0;
let SERVERS;

function open_map() {
    this.last_click = this.last_click ?? 0;
    const now = Date.now();
    if (now - this.last_click > 500) {
        this.last_click = now;
        return;
    }
    Dialog.show("map");
}

function init_mobile(ua, width, height, dpr) {
    let _t5 = window.devicePixelRatio;
    ua = Math.floor(ua / _t5);
    width = Math.floor(width / _t5);
    window.screenTop = ua;
    let _t6 = document.body.clientHeight - ua - width;
    $(".login-content").height(_t6 + 'px').css("marginTop", ua + 'px');
    $(".container").height(_t6 + 'px').css("marginTop", ua + 'px');
}

function CheckLogin() {
    var _t7 = GetUserCookie('p');
    if (!_t7)
        return $("#login_panel").show();
    ShowServers();
}

function is_weixin() {
    var _t8 = navigator.userAgent.toLowerCase();
    return _t8.match(/MicroMessenger/i) === "micromessenger" ? !![] : ![];
}

const LoginMethods = {
    initReg: false,
    isRegistValidation: false,

    ToRegist: function () {
        HideAndShow($("#regist_panel"));
        if (!LoginMethods.initReg) {
            LoginMethods.GetValidationImage();
            $(".validnum-box>.validnum-img").on("click", LoginMethods.GetValidationImage);
            LoginMethods.initReg = true;
        }
    },

    GetValidationImage: function () {
        API.UserAPI.ValidationImage(function (_t9) {
            $(".validnum-box>.validnum-img").attr("src", "data:image/svg+xml;base64," + _t9);
        });
    },

    ToUpdate: function () {
        HideAndShow("#pwd_panel");
        API.UserAPI.GetPhone(function (_t11) {
            if (_t11.code !== 1) {
                return ShowInputError("#update_pwd1", "获取绑定的手机号失败");
            }
            if (_t11.result) {
                $("#pwd_phone").prop("disabled", true).val(_t11.result);
                $("#pwd_bind").show();
            } else {
                $("#pwd_phone").prop("disabled", false).val('');
                $('#pwd_bind').hide();
            }
        });
    },

    ResetPwd: function () {
        const resetName = $("#reset_name").val();
        if (!resetName) return ShowInputError("#reset_name", "请输入用户名");
        if (!/^[a-z0-9]{5,15}$/.test(resetName)) {
            return ShowInputError("#reset_name", "用户名格式错误,需要5-15位字母开头的字母，数字或下划线，不区分大小写");
        }

        const resetPhone = $("#reset_phone").val();
        if (!resetPhone) return ShowInputError("#reset_phone", "请输入你的帐号绑定的手机号码");
        if (!/^1\d{10}$/.test(resetPhone)) return ShowInputError("#reset_phone", '手机号码格式错误');

        const resetPwd1 = $("#reset_pwd1").val();
        if (!resetPwd1) return ShowInputError("#reset_pwd1", "请输入你的新密码");

        const resetPwd2 = $("#reset_pwd2").val();
        if (!resetPwd2) return ShowInputError("#reset_pwd2", '请重复输入你的新密码');
        if (resetPwd2.length < 6 || resetPwd2.length > 20) {
            return ShowInputError("#reset_pwd2", "密码长度在6到20之间");
        }
        if (resetPwd2 !== resetPwd1) return ShowInputError("#reset_pwd2", "两次密码输入不一致");

        ShowLoader("正在修改密码", "#reset_panel");
        API.UserAPI.ResetPasswordByPhone(resetName, resetPhone, '', resetPwd1, function (_t14) {
            if (_t14.code) {
                HideAndShow("#login_panel");
            } else {
                ShowInputError("#reset_pwd2", _t14.result ?? "重置失败");
                HideAndShow("#reset_panel");
            }
        });
    },

    BindPhone: function () {
        HideAndShow("#bind_panel");
        API.UserAPI.GetPhone(function (_t16) {
            const phone_valid = $("#phone_valid");
            const input_error = $(".input-error");
            const phone_no = $("#phone_no");

            phone_valid.val('');
            $('#phone_pwd').val('');

            if (_t16.code !== 1) {
                return input_error.html(_t16.result);
            }
            input_error.remove();
            const hasBindPhone = _t16.result;

            if (hasBindPhone) {
                phone_no.prop('disabled', true).val(hasBindPhone);
                phone_valid.parent().show().prev().show();
                phone_no.prev().html("你已绑定手机，再次验证会取消绑定");
                phone_no.parent().next().find("span:last()").html('解除绑定');
            } else {
                phone_no.prop("disabled", false).val('');
                phone_no.prev().html("你要绑定的手机(不验证，目前仅作为二级密码验证使用)");
                phone_valid.parent().hide().prev().hide();
                phone_no.parent().next().find("span:last()").html('绑定');
            }
        });
    },

    CheckValid: function () {
        const phoneInput = $('#phone_no');
        let phoneVal = '';
        let smsCode = '';

        if (!phoneInput.is(":disabled")) {
            phoneVal = phoneInput.val();
            if (!phoneVal) return ShowInputError("#phone_no", "请输入你的帐号绑定的手机号码");
            if (!/^1\d{10}$/.test(phoneVal)) return ShowInputError('#phone_no', "手机号码格式错误");
        } else {
            smsCode = $("#phone_valid").val();
            if (!smsCode) return ShowInputError($("#phone_valid").parent(), "请输入你接收到的六位验证码");
            if (!/^\d{6}$/.test(smsCode)) return ShowInputError($("#phone_valid").parent(), "请输入六位数字的验证码");
        }

        const phonePwd = $("#phone_pwd").val();
        if (!phonePwd) return ShowInputError('#phone_pwd', '请重复输入你的新密码');
        if (phonePwd.length < 6 || phonePwd.length > 20) {
            return ShowInputError("#phone_pwd", "密码长度在6到20之间");
        }

        API.UserAPI.BindPhone(smsCode, phoneVal, phonePwd, function (_t21) {
            if (_t21.code < 1) {
                ShowInputError($("#phone_valid").parent(), _t21.result ?? "绑定失败");
                HideAndShow("#bind_panel");
            } else {
                HideAndShow("#role_panel");
            }
        });
    },

    ReLogin: function () {
        HideAndShow($("#login_panel"));
        const expireTime = new Date();
        expireTime.setTime(-1000);
        const cookieArr = document.cookie.split('; ');
        for (let i = 0; i < cookieArr.length; i++) {
            const kv = cookieArr[i].split('=');
            document.cookie = kv[0] + "=''; expires=" + expireTime.toGMTString();
        }
    },

    UpdatePwd: function () {
        $("#pwd_panel").find(".input-error").remove();
        const oldPwd = $("#update_pwd1").val();
        const newPwd1 = $("#update_pwd2").val();
        const newPwd2 = $("#update_pwd3").val();

        if (oldPwd.length < 6 || oldPwd.length > 20) return ShowInputError("#update_pwd1", "密码长度在6到20之间");
        if (newPwd1.length < 6 || newPwd1.length > 20) return ShowInputError("#update_pwd2", "密码长度在6到20之间");
        if (newPwd2 !== newPwd1) return ShowInputError("#update_pwd3", "两次密码输入不一致");

        let phoneLast4 = null;
        if ($('#pwd_bind').is(':visible')) {
            phoneLast4 = $('#pwd_no').val();
            if (!phoneLast4) return ShowInputError($("#pwd_no").parent(), "请输入你绑定的手机尾号");
            if (!/^\d{4}$/.test(phoneLast4)) return ShowInputError($('#pwd_no').parent(), "请输入你绑定的手机尾号");
        }

        ShowLoader('正在修改密码', '#pwd_panel');
        API.UserAPI.ChangePassword(oldPwd, newPwd1, phoneLast4, function (_t28) {
            if (_t28.code) {
                HideAndShow($("#slist_panel"));
            } else {
                ShowInputError("#update_pwd1", _t28.result || "修改失败");
                HideAndShow('#pwd_panel');
            }
        });
    },

    LoginIn: function () {
        const loginName = $("#login_name").val().toLowerCase();
        const loginPwd = $('#login_pwd').val();

        if (!loginName) return ShowInputError("#login_name", "请输入用户名");
        if (!/^[a-z0-9]{5,15}$/.test(loginName)) {
            return ShowInputError("#login_name", "用户名格式错误,需要5-15位字母开头的字母，数字或下划线，不区分大小写");
        }
        if (!loginPwd) return ShowInputError('#login_pwd', "请输入密码");
        if (loginPwd.length < 6 || loginPwd.length > 20) return ShowInputError('#login_pwd', "密码长度在6到20之间");

        ShowLoader("正在登录", "#login_panel");
        API.UserAPI.Login(loginName, loginPwd, function (_t30) {
            if (_t30.code) {
                ShowServers();
            } else {
                ShowInputError("#login_name", _t30.result || "登陆失败");
                HideAndShow("#login_panel");
            }
        });
    },

    SelectServer: function () {
        if (!SERVERS) return;
        const idx = parseInt($(".server-list>.select").attr('index'));
        if (!(idx >= 0 && idx < SERVERS.length)) {
            return Confirm.Show({ content: "你没有选择要连接的服务器。" });
        }
        const serverItem = SERVERS[idx];
        if (!serverItem) {
            return Confirm.Show({ content: "你没有选择要连接的服务器。" });
        }
        ShowLoader("正在连接服务器");
        ConnectServer(serverItem);
        SetCookie('s', idx);
    },

    SelectRole: function () {
        const selectRoleDom = $(".role-list>.select");
        if (!selectRoleDom.length) return;
        const roleId = selectRoleDom.attr('roleid');
        SendCommand("login " + roleId);
        ShowLoader("正在进入游戏", "#role_panel");
    },

    CreateRole: function () {
        const role = {};
        role.name = $('#reg_name').val();
        role.gender = $("#gender_0").is(":checked") ? 1 : 2;
        role.str = parseInt($("#reg_str").val());
        role.con = parseInt($("#reg_con").val());
        role.dex = parseInt($("#reg_dex").val());
        role.int = parseInt($("#reg_int").val());

        if (!/^[\u4E00-\u9FA5]{2,5}$/.test(role.name)) {
            return ShowInputError('#reg_name', "名称格式错误，只能使用2-5位中文字符");
        }
        if (role.str < 15 || role.str > 30) return ShowInputError('#reg_name', "臂力需要在15-30之间");
        if (role.con < 15 || role.con > 30) return ShowInputError("#reg_name", "根骨需要在15-30之间");
        if (role.dex < 15 || role.dex > 30) return ShowInputError("#reg_name", "身法需要在15-30之间");
        if (role.int < 15 || role.int > 30) return ShowInputError("#reg_name", "悟性需要在15-30之间");
        if (role.str + role.con + role.dex + role.int !== 80) {
            return ShowInputError("#reg_name", "先天属性需要在15-30之间，并且总和等于80");
        }

        ShowLoader("正在创建角色", "#addrole_panel");
        SendCommand("createrole " + role.name + ' ' + role.gender + ' ' + role.str + ' ' + role.con + ' ' + role.dex + ' ' + role.int);
    },

    AddRole: function () {
        HideAndShow($("#addrole_panel"));
        RefreshInput("name");
        RefreshInput("prop");
        RefreshInput('id');
    },

    DeleteRole: function () {
        const selRole = $(".role-list>.select");
        if (!selRole.length) return;
        const roleId = selRole.attr("roleid");
        if (!roleId) return;
        Confirm.Show({
            content: "是否确认删除角色：" + selRole.html(),
            onOK: function () {
                SendCommand("deleterole " + roleId);
            }
        });
    },

    Regist: function () {
        const regName = $("#regist_name").val().toLowerCase();
        const regPwd1 = $("#regist_pwd1").val();

        if (!regName) return ShowInputError("#regist_name", "请输入用户名");
        if (!/^[a-z0-9]{5,15}$/.test(regName)) {
            return ShowInputError("#regist_name", "用户名需要是5-15个英文字符");
        }
        if (!regPwd1) return ShowInputError("#regist_pwd1", "请输入密码");
        if (regPwd1.length < 6 || regPwd1.length > 20) {
            return ShowInputError("#regist_pwd1", "密码长度在6到20之间");
        }
        if (regPwd1 != $("#regist_pwd2").val()) {
            return ShowInputError("#regist_pwd2", "重复密码输入不一致，请重新输入");
        }
        const valNo = $("#regist_val").val();
        if (!valNo) return ShowInputError("#regist_valpanel", '请输入图片中的验证码');
        if (valNo.length !== 4) return ShowInputError("#regist_valpanel", "请输入图片中的四位验证码");

        API.UserAPI.Regist({
            name: regName,
            pwd: regPwd1,
            valno: valNo
        }, function (_t34) {
            if (_t34.code === 1) {
                ShowServers();
            } else {
                ShowInputError("#regist_name", _t34.result || "注册失败");
                HideAndShow("#regist_panel");
            }
        });
    }
};

function LoginCommand(event) {
    var _J1 = $(this).attr("command");
    switch (_J1) {
    case "ToRolePanel":
        HideAndShow($("#role_panel"));
        break;
    case "ToServerPanel":
        CloseServer();
        HideAndShow($("#slist_panel"));
        break;
    case "ToLogin":
        HideAndShow($("#login_panel"));
        break;
    case 'Forget':
        HideAndShow($("#reset_panel"));
        break;
    case "CancleRegist":
        HideAndShow($("#login_panel"));
        break;
    case "Down":
        HideAndShow($("#download"));
        break;
    default:
        LoginMethods[_J1]();
        break;
    }
}


function SendValidateCode() {
    const _J19 = $(this);
    if (_J19.is(':disabled'))
        return;
    const _t36 = _J19.parent().prev().prev()
    let _t37 = _t36.val();
    if (!_t36.is(':disabled')) {
        if (!_t37) return ShowInputError(_t36, "请输入你的帐号绑定的手机号码");
        if (!/^1\d{10}$/.test(_t37)) return ShowInputError(_t36, '手机号码格式错误');
    } else
        _t37 = '';
    API.UserAPI.SendValidateCode(_t37, function(_t38) {
        if (!_t38)
            ShowInputError(_J19.parent(), "验证码发送失败");
    });
    _J19.prop("disabled", !![]);
    _J19.html("120秒后重新发送");
    SetButtonText(0, _J19);
}

function SetButtonText(remaining, button) {
    if (remaining === 120) {
        button.prop('disabled', ![]);
        button.html("发送验证码");
    } else {
        button.html(120 - remaining + '秒后重新发送');
        remaining++;
        window.setTimeout(SetButtonText.bind(this, remaining, button), 1000);
    }
}

function SetCookie(name, value) {
    const date = new Date();
    date.setTime(date.getTime() + 300 * 24 * 60 * 60 * 1000);
    const _t54 = 'expires=' + date.toUTCString();
    document.cookie = name + '=' + value + ';\x20expires=' + date.toGMTString();
}