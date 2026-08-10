//$.support.cors = true;
/*************************************************
  Function:    	Common
  Description:	公共类
*************************************************/
function Common() {
    this.m_szHostName = location.hostname;
	this.m_szHostNameOriginal = location.hostname;
	//this.m_szHostName = "172.10.17.230";
	this.m_lHttpPort = "80";
	this.m_lHttp = location.protocol + "//";
	this.m_lRtspPort = "554";
	this.m_szHttpPort = "80";  //https登录时获取http端口私有预览
	this.m_szManagePort = "8000";
	this.m_szUserPwdValue = "";
	
	if(location.port != "") {
	    this.m_lHttpPort = location.port;
	} else if(this.m_lHttp == "https://") {
	    this.m_lHttpPort = "443";
    }
	if(this.m_szHostName.indexOf("[") != -1) {
		this.m_szHostNameOriginal = this.m_szHostName.substring(1,this.m_szHostName.length -1);    
	}	
	if(this._isIPv6Add(this.m_szHostNameOriginal)) {		
	    this.m_szHostName = "[" + this.m_szHostNameOriginal + "]";	
	}
	
	this.m_szExit = "";  //是否注销
	this.m_oXmlDoc = null;  //模拟通道
	this.m_oDigXmlDoc = null;  //数字通道
	this.m_oZeroXmlDoc = null;  //零通道
	
	this.m_PreviewOCX = null;  //插件
	this.m_bIsIE  = !(/(msie\s|trident.*rv:)([\w.]+)/.exec( navigator.userAgent.toLowerCase()) == null);
	
    this.m_iChannelId = []; //通道对应的ID号
	for(var i = 0; i < 256; i++) {
		this.m_iChannelId[i] = -1;
	}
	
	this.m_iAnalogChannelNum = 0;
    this.m_iDigitalChannelNum = 0;
    this.m_iZeroChanNum = 0;
	
    this.m_iTalkNum = 0;  //语音对讲通道数
    this.m_bTalk = 0; //是否正在对讲
    this._m_iTalkingNO = 0; //正在对讲的通道号
    this._m_szaudioCompressionType = 'G.711ulaw';
	this.m_bPPPoEStatus = false;
	this.m_bSupportShttpPlay = false;  //私有预览
	this.m_bSupportShttpPlayback = false;  //私有回放
	this.m_bSupportShttpsPlay = false;  //https私有预览
	this.m_bSupportShttpsPlayback = false;  //https私有回放	
	this.m_iIpChanBase = 1;  //私有取流通道初始值
	this.m_bSupportTransCode = false;  //是否支持转码
	this.m_bSupportPatrols = false;  //是否支持巡航
	this.m_bSupportShttpPlaybackTransCode = false;
	this.m_bSupportShttpsPlaybackTransCode = false;
	this.m_bSupportStreamSecret = false;
}

Common.prototype = {
	
	//从xml文件中解析xml
	_parseXml: function (fileRoute) {
		xmlDoc=null;
		if(window.ActiveXObject) {
			var xmlDom=new ActiveXObject("Microsoft.XMLDOM");
			xmlDom.async=false;
			xmlDom.load(fileRoute);
			xmlDoc=xmlDom;
		} else if(document.implementation && document.implementation.createDocument) {
			var xmlhttp=new window.XMLHttpRequest();
			xmlhttp.open("get", fileRoute, false);
			xmlhttp.send(null);
			xmlDoc=xmlhttp.responseXML;
		} else {
			xmlDoc=null;
		}
		return xmlDoc;
    },
	
	//比较文件版本
    _compareVersion: function (szFileName) {
		var xmlDoc = this._parseXml("../xml/version.xml?version=" + ((typeof global_config !== "undefined")?global_config.web_version:window.parent.global_config.web_version));
		var fvOld = this.m_PreviewOCX.GetFileVersion(szFileName,"FileVersion");
		var fvNew = $(xmlDoc).find(szFileName).eq(0).text();
		if(szFileName == "hpr.dll") {
			var sp = ".";
		} else {
			var sp = ",";
		}
		var fvSigleOld = fvOld.split(sp);
		var fvSigleNew = fvNew.split(sp);
		for(var i = 0; i < 4; i++) {
			if(parseInt(fvSigleOld[i]) > parseInt(fvSigleNew[i])) {
				return -1;
			}
			if(parseInt(fvSigleOld[i]) < parseInt(fvSigleNew[i])) {
				return 1;
			}
		}
		return 0;
    },
	
	//获取内部RTSP端口
    _getInternalRTSPPort: function () {
		var that = this;
		$.ajax({
			type: "GET",
			beforeSend: function(xhr) {
				xhr.setRequestHeader("If-Modified-Since", "0");
				xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
			},
			timeout: 15000,
			async: false,
			url: that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/ISAPI/Security/adminAccesses",
			success: function(xmlDoc, textStatus, xhr) {			
				$(xmlDoc).find("AdminAccessProtocol").each(function (i) {
					if($(this).find("protocol").eq(0).text().toLowerCase() === "rtsp") {
						that.m_lRtspPort = $(this).find("portNo").eq(0).text();
					}
					if($(this).find("protocol").eq(0).text().toLowerCase() === "http") {
						that.m_szHttpPort = $(this).find("portNo").eq(0).text();
					}
					if($(this).find("protocol").eq(0).text().toLowerCase() === "dev_manage") {
						that.m_szManagePort = $(this).find("portNo").eq(0).text();
					}
				});
			}
		});
    },
	
	//校验是否为有效的IPV6地址
    _isIPv6Add: function (strInfo) {
		return /:/.test(strInfo) && strInfo.match(/:/g).length<8 && /::/.test(strInfo)?(strInfo.match(/::/g).length==1 && /^::$|^(::)?([\da-f]{1,4}(:|::))*[\da-f]{1,4}(:|::)?$/i.test(strInfo)):/^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i.test(strInfo);
    },
	
	//获取PPPoE状态
	getPPPOEStatus: function () {
		var that = this;
		$.ajax({
			type: "get",
			url:  that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/ISAPI/System/Network/PPPoE/1/status",
			timeout: 15000,
			async: false,
			beforeSend: function(xhr) {
				xhr.setRequestHeader("If-Modified-Since", "0");
				xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
			},
			success: function(xmlDoc, textStatus, xhr) {
				if($(xmlDoc).find("ipAddress").length > 0) {
					that.m_bPPPoEStatus = !!$.isDIpAddress($(xmlDoc).find("ipAddress").eq(0).text());
				} else if($(xmlDoc).find("ipv6Address").length > 0) {	
					that.m_bPPPoEStatus = !!$.isIPv6($(xmlDoc).find("ipv6Address").eq(0).text());
				} else {
					that.m_bPPPoEStatus = false;
				}
			}
		});	
	},
	
	//是否支持转码码流
	getCapbilities: function () {
		var that = this;
	    $.ajax({
		    type: "get",
			url:  that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/ISAPI/System/capabilities",
			timeout: 15000,
			async: false,
			beforeSend: function (xhr) {
			    xhr.setRequestHeader("If-Modified-Since", 0);
				xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
			},
			success: function (xmlDoc, textStatus, xhr) {
				that.m_bSupportTransCode = !!($(xmlDoc).find("RacmCap").eq(0).find("isSupportTransCode").eq(0).text() === "true");
				if($(xmlDoc).find("PTZCtrlCap").length > 0) {
					that.m_bSupportPatrols = !!($(xmlDoc).find("PTZCtrlCap").eq(0).find("isSupportPatrols").eq(0).text() === "true");
				}
				that.m_bSupportStreamSecret = !!($(xmlDoc).find("isSupportStreamingEncrypt").eq(0).text() === "true");
				if(typeof g_oPlaybackInstance !== "undefined") {
					g_oPlaybackInstance.m_bSupportPicDown = !!($(xmlDoc).find("isSupportSrcIDSearch").eq(0).text() === "true");
				}
			}
		});
	},	
	//是否支持私有取流
	isSupportShttp: function () {
		var that = this;
	    $.ajax({
		    type: "get",
			url:  that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/SDK/capabilities",
			timeout: 15000,
			async: false,
			beforeSend: function (xhr) {
			    xhr.setRequestHeader("If-Modified-Since", 0);
				xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
			},
			success: function (xmlDoc, textStatus, xhr) {
				that.m_bSupportShttpPlay = !!($(xmlDoc).find("isSupportHttpPlay").eq(0).text() === "true");
				that.m_bSupportShttpPlayback = !!($(xmlDoc).find("isSupportHttpPlayback").eq(0).text() === "true");
				that.m_bSupportShttpsPlay = !!($(xmlDoc).find("isSupportHttpsPlay").eq(0).text() === "true");
				that.m_bSupportShttpsPlayback = !!($(xmlDoc).find("isSupportHttpsPlayback").eq(0).text() === "true");
				that.m_bSupportShttpPlaybackTransCode = !!($(xmlDoc).find("isSupportHttpTransCodePlayback").eq(0).text() === "true");
				that.m_bSupportShttpsPlaybackTransCode = !!($(xmlDoc).find("isSupportHttpsTransCodePlayback").eq(0).text() === "true");
				if($(xmlDoc).find("ipChanBase").length > 0) {
					that.m_iIpChanBase = parseInt($(xmlDoc).find("ipChanBase").eq(0).text(), 10);
				}
			}
		});		
	},
	//子页面销毁时，修改cookie为当前页
	unloadPage: function (src,index) {
		try{
			g_oCommon.m_PreviewOCX.StopRealPlayAll();
			g_oCommon.m_PreviewOCX.HWP_StopVoiceTalk();
		} catch(oError) {
		}
		$.cookie("page", src + "%" + index);
		if(1 == index) {
			$("#main_plugin").empty();
		} else if(2 == index) {
			for(var i = 0; i < 64; i++) {
				if(g_oPlaybackInstance.m_DownWindow[i] && g_oPlaybackInstance.m_DownWindow[i].open && !g_oPlaybackInstance.m_DownWindow[i].closed) {
					g_oPlaybackInstance.m_DownWindow[i].close();
				}	
			}
			if (g_oPlaybackInstance.m_PictureDownWindow && g_oPlaybackInstance.m_PictureDownWindow.open && !g_oPlaybackInstance.m_PictureDownWindow.closed) {
				g_oPlaybackInstance.m_PictureDownWindow.close();
			}
			$("#main_plugin").empty();
			$("#playbackbar").empty();
		} else if(3 == index) {
		
		} else {
			$("#main_plugin").empty();
		}
	},
	
    //xml转换字符串
    xmlToStr: function (Xml) {
		var XmlDocInfo = "";
		try {
			var oSerializer = new XMLSerializer();
			XmlDocInfo = oSerializer.serializeToString(Xml);
		} catch (e) {
			try {
				XmlDocInfo = Xml.xml;
			} catch (e) {
				return "";
			}
		}
		if(XmlDocInfo.indexOf("<?xml") == -1) {
			XmlDocInfo = "<?xml version='1.0' encoding='utf-8'?>" + XmlDocInfo;
		}
		return XmlDocInfo;
    },
	
	//从xml字符串中解析xml
    parseXmlFromStr: function (szXml) {
		if(null == szXml || '' == szXml) {
			return null;
		}
		var xmlDoc=new this.createxmlDoc();
		if(navigator.appName == "Netscape" || navigator.appName == "Opera") {
			var oParser = new DOMParser();
			xmlDoc = oParser.parseFromString(szXml,"text/xml");
		} else {
			xmlDoc.loadXML(szXml);
		}
		return xmlDoc;
    },
	
    //检测是否安装插件及向页面插入插件元素
    checkPlugin: function (iType, szInfo, iWndType, szPlayMode) {
		var that = this;
		var szNotWin32Info = that.getNodeValue("laNotWin32Plugin");
		if(!that.m_bIsIE) {
			var bInstalled = false;
			var len = navigator.mimeTypes.length;
			for(var i = 0; i < len; i++) {
				if(navigator.mimeTypes[i].type.toLowerCase() == "application/hwp-webvideo-plugin") {
					bInstalled = true;
					if(iType == "0") {
						$("#main_plugin").html("<embed type='application/hwp-webvideo-plugin' id='PreviewActiveX' width='1' height='1' name='PreviewActiveX' align='center' wndtype='"+iWndType+"' playmode='"+szPlayMode+"'>");
						setTimeout(function() { $("#PreviewActiveX").css("height","0px"); }, 10); // 避免插件初始化不完全
					} else if(iType == "1") {
						$("#main_plugin").html("<embed type='application/hwp-webvideo-plugin' id='PreviewActiveX' width='352' height='288' name='PreviewActiveX' align='center' wndtype='"+iWndType+"' playmode='"+szPlayMode+"'>");
					} else {
						$("#main_plugin").html("<embed type='application/hwp-webvideo-plugin' id='PreviewActiveX' width='100%' height='100%' name='PreviewActiveX' align='center' wndtype='"+iWndType+"' playmode='"+szPlayMode+"'>");
					}
					$("#PreviewActiveX").css('width','99.99%');
					break;
				}
			}
			if(!bInstalled) {
				if(navigator.platform == "Win32") {
					$("#main_plugin").html("<label name='laPlugin' onclick='window.open(\"../../codebase/WebComponents.exe\",\"_self\")' class='pluginLink' onMouseOver='this.className =\"pluginLinkSel\"' onMouseOut='this.className =\"pluginLink\"'>"+szInfo+"<label>");
				} else if(navigator.platform == "Mac68K" || navigator.platform == "MacPPC" || navigator.platform == "Macintosh") {
					$("#main_plugin").html("<label name='laNotWin32Plugin' onclick='' class='pluginLink' style='cursor:default; text-decoration:none;'>"+szNotWin32Info+"<label>");
				} else {
					$("#main_plugin").html("<label name='laNotWin32Plugin' onclick='' class='pluginLink' style='cursor:default; text-decoration:none;'>"+szNotWin32Info+"<label>");
				}
				return false;
			}
		} else {
			$("#main_plugin").html("<object classid='clsid:E7EF736D-B4E6-4A5A-BA94-732D71107808' codebase='' standby='Waiting...' id='PreviewActiveX' width='100%' height='100%' name='ocx' align='center' ><param name='wndtype' value='"+iWndType+"'><param name='playmode' value='"+szPlayMode+"'></object>");
			var previewOCX = $("#PreviewActiveX")[0];
			if(previewOCX == null || previewOCX.object == null) {
				if((navigator.platform == "Win32") || (navigator.platform == "Windows")) {
					$("#main_plugin").html("<label name='laPlugin' onclick='window.open(\"../../codebase/WebComponents.exe\",\"_self\")' class='pluginLink' onMouseOver='this.className =\"pluginLinkSel\"' onMouseOut='this.className =\"pluginLink\"'>"+szInfo+"<label>");
				} else if(navigator.platform == "Mac68K" || navigator.platform == "MacPPC" || navigator.platform == "Macintosh") {
					$("#main_plugin").html("<label name='laPlugin' onclick='' class='pluginLink' style='cursor:default; text-decoration:none;'>"+szNotWin32Info+"<label>");
				} else {
					$("#main_plugin").html("<label name='laPlugin' onclick='' class='pluginLink' style='cursor:default; text-decoration:none;'>"+szNotWin32Info+"<label>");
				}
				return false;
			}
		}
		return true;
    },
	
	//比较文件版本
    compareFileVersion: function () {
		var previewOCX = $("#PreviewActiveX")[0];
		if(previewOCX == null) {
			return false;
		}
		var xmlDoc = this._parseXml("../xml/version.xml?version=" + ((typeof global_config !== "undefined")?global_config.web_version:window.parent.global_config.web_version));
		var szXml = this.xmlToStr(xmlDoc);
		var bRes = false;
		try {
			bRes = !previewOCX.HWP_CheckPluginUpdate(szXml);
			return bRes;
		} catch(e) {
			if(navigator.appName != 'Netscape') {
				if(1 == this._compareVersion("WebVideoActiveX.ocx")) {
					return false;		//插件需要更新
				}
			} else {
				if(1 == this._compareVersion("npWebVideoPlugin.dll")) {
					return false;		//插件需要更新
				}
			}
			if(1 == this._compareVersion("PlayCtrl.dll")) {
				return false;		//插件需要更新
			}
			if(1 == this._compareVersion("StreamTransClient.dll")) {
				return false;		//插件需要更新
			}
			if(1 == this._compareVersion("NetStream.dll")) {
				return false;		//插件需要更新
			}
			if(1 == this._compareVersion("SystemTransform.dll")) {
				return false;		//插件需要更新
			}
			return true;
		}
    },
	
	//创建xmlhttprequest对象
    getXMLHttpRequest: function () {
        var xmlHttpRequest = null; 
        if (window.XMLHttpRequest) {
            xmlHttpRequest = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
        	xmlHttpRequest = new ActiveXObject("Microsoft.XMLHTTP");
        } 
     	return xmlHttpRequest;
    },
	
	//创建xml DOM对象
    createxmlDoc: function () {
		var xmlDoc;
		var aVersions = [ "MSXML2.DOMDocument","MSXML2.DOMDocument.5.0",
		"MSXML2.DOMDocument.4.0","MSXML2.DOMDocument.3.0",
		"Microsoft.XmlDom"];
		for (var i = 0; i < aVersions.length; i++) {
			try  {
				xmlDoc = new ActiveXObject(aVersions[i]);
				break;
			} catch (e) {
				xmlDoc = document.implementation.createDocument("", "", null);
				break;
			}
		}
		xmlDoc.async="false";
		return xmlDoc;
    },
	
	//注销用户
    goAway: function () {
		Warning = confirm(ContentFrame.window.g_oCommon.m_szExit);
		if(Warning) {
			$.cookie('userInfo' + this.m_lHttpPort, null);
			$.cookie('page',null);
			window.location.href = "login.asp";
		}
    },
	
	//浏览系统文件夹路径
    browseFilePath: function (szId, iSelectMode, szFileType) {
		if(szFileType === undefined || szFileType === null) {
			szFileType = "";
		}
		if(this.m_PreviewOCX != null) {
			var szPost = this.m_PreviewOCX.HWP_OpenFileBrowser(iSelectMode, szFileType);
			if(szPost == "" || szPost == null) {
				return;
			} else {
				if(iSelectMode == 1) {
					if(szPost.length > 100) {
						alert(this.getNodeValue('tipsTooLong'));
						return;
					}
				} else {
					if(szPost.length > 130) {
						alert(this.getNodeValue('tipsTooLong'));
						return;
					}
				}
				$("#" + szId).val(szPost);
			}
		}
    },
	
	//创建日历, iType: 0 日志界面日历 1 时间配置界面日历 2 假日配置界面日历
    createCalendar: function (iType) {
		var szLanguage = "";
		if(parent.translator.szCurLanguage == 'zh') {
			szLanguage = 'zh-cn';
		} else {
			$.each(parent.translator.languages, function(i) {
					if (this.value === parent.translator.szCurLanguage) {
						szLanguage = this.value;
					}
			});
			if(szLanguage === '') {
				szLanguage = 'en';
			}
		}
		if(iType == 0) {
			WdatePicker({startDate:'%y-%M-%d %h:%m:%s',dateFmt:'yyyy-MM-dd HH:mm:ss',alwaysUseStartDate:false,minDate:'1970-01-01 00:00:00',maxDate:'2037-12-31 23:59:59',readOnly:true,lang:szLanguage,isShowClear:false,isShowToday:false});
		} else if(iType == 1) {
			WdatePicker({startDate:'%y-%M-%d %h:%m:%s',dateFmt:'yyyy-MM-ddTHH:mm:ss',alwaysUseStartDate:false,minDate:'1970-01-01 00:00:00',maxDate:'2037-12-31 23:59:59',readOnly:true,lang:szLanguage,isShowClear:false,isShowToday:false});
		} else {
			WdatePicker({startDate:'%y-%M-%d',dateFmt:'yyyy-MM-dd',alwaysUseStartDate:true,minDate:'1970-01-01 00:00:00',maxDate:'2037-12-31 23:59:59',readOnly:true,lang:szLanguage,isShowClear:false,isShowToday:false});
		}
    },
	
	//得到节点值
	getNodeValue: function (tagName) {
		if (parent != this) { // 父frame包含Translator.js，当前frame包含common.js
			var _translator = parent.translator;
		} else { // 当前节点包含Translator.js和common.js
			var _translator = translator;
		}
		if (_translator.s_lastLanguageXmlDoc !== null) {
			return _translator.translateNodeByLastLxd(tagName);
		}
    },
	
	//日期加天数
	dayAdd: function (szDay,iAdd) {
		var date =  new Date(Date.parse(szDay.replace(/\-/g,'/')));
		var newdate = new Date(date.getTime() + (iAdd * 24 * 60 * 60 * 1000));
		
		return newdate.Format("yyyy-MM-dd hh:mm:ss");   
	},
	
	//获取RTSP端口
	getRTSPPort: function () {
		var that = this;
		that.getPPPOEStatus();
		if(that.m_bPPPoEStatus) {
			that._getInternalRTSPPort();
		} else {
			$.ajax({
				type: "get",
				url:  that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/ISAPI/System/Network/UPnP/ports/status",
				timeout: 15000,
				async: false,
				beforeSend: function (xhr) {
					xhr.setRequestHeader("If-Modified-Since", "0");
					xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
				},
				success: function (xmlDoc, textStatus, xhr) {
					var oXmlUPnP = xmlDoc;
					var szExternalRtspPort = "554";
					var szExternalHttpPort = "80";
					$(oXmlUPnP).find("portStatusList").eq(0).find("portStatus").each(function (i) {
						if($(this).find("internalPort").eq(0).text().toLowerCase() === "rtsp") {
							szExternalRtspPort = $(this).find("externalPort").eq(0).text();
						}
						if($(this).find("internalPort").eq(0).text().toLowerCase() === "http") {
							szExternalHttpPort = $(this).find("externalPort").eq(0).text();
						}
					});
					$.ajax({
						type: "get",
						url:  that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/ISAPI/System/Network/Bond",
						timeout: 15000,
						async: false,
						beforeSend: function (xhr) {
							xhr.setRequestHeader("If-Modified-Since", "0");
							xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
						},
						success: function (xmlDoc, textStatus, xhr) {
							if($(xmlDoc).find("enabled").eq(0).text() === "true") {
								if($.isIPv6(that.m_szHostNameOriginal)) {
									if($(xmlDoc).find("ipv6Address").eq(0).text() !== that.m_szHostNameOriginal) {
										that.m_lRtspPort = szExternalRtspPort;
										that.m_szHttpPort = szExternalHttpPort;
									} else {
										that._getInternalRTSPPort();
									}
								} else {
									if($(xmlDoc).find("ipAddress").eq(0).text() !== that.m_szHostName) {
										that.m_lRtspPort = szExternalRtspPort;
										that.m_szHttpPort = szExternalHttpPort;
									} else {
										that._getInternalRTSPPort();	
									}			
								}					    
							} else {
								$.ajax({
									type: "get",
									url:  that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/ISAPI/System/Network/interfaces",
									timeout: 15000,
									async: false,
									beforeSend: function (xhr) {
										xhr.setRequestHeader("If-Modified-Since", "0");
										xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
									},
									success: function (xmlDoc, textStatus, xhr) {
										var isSameHostname = false;
										if($.isIPv6(that.m_szHostNameOriginal)) {
											$(xmlDoc).find("NetworkInterface").each(function (i) {
												if($(this).find("ipv6Address").eq(0).text() === that.m_szHostNameOriginal) {
													isSameHostname = true;
												}
											});
											if(!isSameHostname) {
												that.m_lRtspPort = szExternalRtspPort;
												that.m_szHttpPort = szExternalHttpPort;
											} else {
												that._getInternalRTSPPort();				
											}
										} else {
											$(xmlDoc).find("NetworkInterface").each(function (i) {
												if($(this).find("ipAddress").eq(0).text() === that.m_szHostName) {
													isSameHostname = true;
												}
											});
											if(!isSameHostname) {
												that.m_lRtspPort = szExternalRtspPort;
												that.m_szHttpPort = szExternalHttpPort;
											} else {
												that._getInternalRTSPPort();			
											}			
										}
									}
								});							    
							}
						},
						error: function (xhr, textStatus, errorThrown) {
							$.ajax({
								type: "get",
								url:  that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/ISAPI/System/Network/interfaces",
								timeout: 15000,
								async: false,
								beforeSend: function (xhr) {
									xhr.setRequestHeader("If-Modified-Since", "0");
									xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
								},
								success: function (xmlDoc, textStatus, xhr) {
									var isSameHostname = false;
									if($.isIPv6(that.m_szHostNameOriginal)) {
										$(xmlDoc).find("NetworkInterface").each(function (i) {
											if($(this).find("ipv6Address").eq(0).text() === that.m_szHostNameOriginal) {
												isSameHostname = true;
											}
										});
										if(!isSameHostname) {
											that.m_lRtspPort = szExternalRtspPort;
											that.m_szHttpPort = szExternalHttpPort;
										} else {
											that._getInternalRTSPPort();				
										}
									} else {
										$(xmlDoc).find("NetworkInterface").each(function (i) {
											if($(this).find("ipAddress").eq(0).text() === that.m_szHostName) {
												isSameHostname = true;
											}
										});
										if(!isSameHostname) {
											that.m_lRtspPort = szExternalRtspPort;
											that.m_szHttpPort = szExternalHttpPort;
										} else {
											that._getInternalRTSPPort();			
										}			
									}
								}
							});						    
						}
					});
				}, 
				error: function (xhr, textStatus, errorThrown) {
					that._getInternalRTSPPort();
				}
			});
		}
    },
	
	//获取通道信息
    getChannelInfo: function () {
		var that = this;
		$.ajax({
			type: "GET",
			beforeSend: function(xhr) {
				xhr.setRequestHeader("If-Modified-Since", "0");
				xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
			},
			timeout: 15000,
			async: false,
			url: that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/ISAPI/System/Video/inputs/channels",
			success: function(xmlDoc, textStatus, xhr) {
				that.m_oXmlDoc = xmlDoc;
				that.m_iAnalogChannelNum = $(xmlDoc).find("VideoInputChannel").length;
				for(var i = 0; i < that.m_iAnalogChannelNum; i++) {
					that.m_iChannelId[i] = parseInt($(xmlDoc).find("VideoInputChannel").eq(i).find("id").eq(0).text());
				}
			}
		});
    },
	
	//获取数字通道信息
    getDigChannelInfo: function () {
		var that = this;
		$.ajax({
			type: "GET",
			beforeSend: function(xhr) {
				xhr.setRequestHeader("If-Modified-Since", "0");
				xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
			},
			timeout: 15000,
			async: false,
			url: that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/ISAPI/ContentMgmt/InputProxy/channels",
			success: function(xmlDoc, textStatus, xhr) {
				that.m_oDigXmlDoc = xmlDoc;
				that.m_iDigitalChannelNum = $(xmlDoc).find("InputProxyChannel").length;	
				var szTempDoc = $(xmlDoc).find("InputProxyChannel").eq(0);
				for(var i = 0; i < that.m_iDigitalChannelNum; i++) {
					var iChannelId = parseInt($(szTempDoc).find("id").eq(0).text());
					that.m_iChannelId[that.m_iAnalogChannelNum + i] = iChannelId;
					szTempDoc = $(szTempDoc).next();
				}
			}
		});
    },
	
	//获取零通道信息
    getZeroChannelInfo: function () {
		var that = this;
		$.ajax({
			type: "get",
			beforeSend: function(xhr) {
				xhr.setRequestHeader("If-Modified-Since", "0");
				xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
			},
			timeout: 15000,
			async: false,
			url: that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/ISAPI/ContentMgmt/ZeroVideo/channels",
			success: function(xmlDoc, textStatus, xhr) {
				that.m_oZeroXmlDoc = xmlDoc;
				var iZeroLen = $(xmlDoc).find("ZeroVideoChannel").length;
				for(var i = 0; i < iZeroLen; i++) {
					if($(xmlDoc).find("ZeroVideoChannel").eq(i).find("enabled").eq(0).text() === "true") {
						that.m_iChannelId[that.m_iAnalogChannelNum + that.m_iDigitalChannelNum + that.m_iZeroChanNum] = parseInt($(xmlDoc).find("ZeroVideoChannel").eq(i).find("id").eq(0).text(), 10);
						that.m_iZeroChanNum++;
					}
				}
			}	
		});
    },
	
	//更新提示
    updateTips: function () {
		var bUpdateTips = $.cookie("updateTips");
		var szUpdate = "";
		if(bUpdateTips === "true") {
			if(navigator.platform === "Win32") {
				szUpdate = this.getNodeValue("jsUpdatePlugin");
				if(confirm(szUpdate)) {
					window.open("../../codebase/WebComponents.exe", "_self");
				} else {
					$.cookie("updateTips", "false");
				}
			} else {
				szUpdate = this.getNodeValue("jsUpdateNotWin32");
				setTimeout(function() {alert(szUpdate);}, 20);
				$.cookie("updateTips", "false");
			}
		}
    },
	
	//获取语音对讲通道数
    getTalkNum: function () {
		var that = this;
		$.ajax({
			type: "get",
			beforeSend: function(xhr) {
				xhr.setRequestHeader("If-Modified-Since", "0");
				xhr.setRequestHeader("Authorization", "Basic " + that.m_szUserPwdValue);
			},
			timeout: 15000,
			async: false,
			url: that.m_lHttp + that.m_szHostName + ":" + that.m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels",
			success: function(xmlDoc, textStatus, xhr) {
				that.m_iTalkNum = $(xmlDoc).find("TwoWayAudioChannel").length;
				if(that.m_iTalkNum > 0 && ($(xmlDoc).find("audioCompressionType").length > 0)) {
					that._m_szaudioCompressionType = $(xmlDoc).find("audioCompressionType").eq(0).text();
				}
			},
			error: function(xhr, textStatus, errorThrown) {
				that.m_iTalkNum = 0;
			}
		});
    },
	
	//语音对讲
    talk: function (obj) {
		if(this.m_iTalkNum == 0) {
			return;
		}	
		this.m_PreviewOCX = $("#PreviewActiveX")[0];
		if(this.m_bTalk === 0) {
			if(this.m_iTalkNum <= 1) {
				var szOpenURL = this.m_lHttp + this.m_szHostName + ":" + this.m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/1/open";
				var szCloseURL = this.m_lHttp + this.m_szHostName + ":" + this.m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/1/close";
				var szDataUrl = this.m_lHttp + this.m_szHostName + ":" + this.m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/1/audioData";
				var iAudioType = 1;
				if(this._m_szaudioCompressionType == 'G.711ulaw') {
					iAudioType = 1;
				} else if(this._m_szaudioCompressionType == "G.711alaw")   {
					iAudioType = 2;
				} else if(this._m_szaudioCompressionType == "G.726") {
					iAudioType = 3;
				} else {
					iAudioType = 0;
				}
				var iTalk = this.m_PreviewOCX.HWP_StartVoiceTalk(szOpenURL, szCloseURL, szDataUrl, this.m_szUserPwdValue, parseInt(iAudioType));
				if(iTalk == 0) {
					$("#voiceTalk").attr("src", "../images/public/ICON/speak_sound_normal.png");
					$("#voiceTalk").attr("title", this.getNodeValue("StopvoiceTalk"));
					this.m_bTalk =1;
				} else {
					var iError = g_oCommon.m_PreviewOCX.HWP_GetLastError();
					if(iError === 403) {
						alert(this.getNodeValue('jsNoOperationRight'));
					} else {
						alert(this.getNodeValue('VoiceTalkFailed'));
					}
					return ;
				}
			} else {
				if(this.m_iTalkNum > 2) {
					$("#trTalkNum").show();
				} else {
					$("#trTalkNum").hide();
				}
				$('#EditVoiceTalk').css('right', '2px');
				$('#EditVoiceTalk').css('top', $(obj).offset().top - $('#EditPatrolPreset').height() + 5);
				$('#EditVoiceTalk').modal();
				this._m_iTalkingNO = 0;
			}
		} else {
			$("#voiceTalk").attr("src", "../images/public/ICON/speak_normal.png");
			$("#voiceTalk").attr("title", this.getNodeValue("voiceTalk"));
			this.m_PreviewOCX.HWP_StopVoiceTalk();
			this.m_bTalk =0;
		}
    },
	
	//选中语音通道
    selectAllFile: function (num) {
		if(!$("#Num" + num).prop("checked")) {
			 this._m_iTalkingNO = 0;
			 return;
		}
		for(var i = 1; i < 4; i ++) {  
			if(i == num) {
			   $("#Num" + i).prop("checked", true);
			} else {
			   $("#Num" + i).prop("checked", false);
			}
		}
		this._m_iTalkingNO = num;
    },
	
	//确定选择进行对讲
    onVoiceTalkDlgOk: function () {
		if(this._m_iTalkingNO == 0) {
			alert(this.getNodeValue('ChooseTalkChan'));
			return;
		}
		var PlayOCX = $("#PreviewActiveX")[0];
		var szOpenURL = this.m_lHttp + this.m_szHostName + ":" + this.m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/" + this._m_iTalkingNO + "/open";
		var szCloseURL = this.m_lHttp + this.m_szHostName + ":" + this.m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/" + this._m_iTalkingNO + "/close";
		var szDataUrl = this.m_lHttp + this.m_szHostName + ":" + this.m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/" + this._m_iTalkingNO + "/audioData";
		var iAudioType = 1;
		//add by tangzz 2012-02-24 添加2种对讲类型
		if(this._m_szaudioCompressionType == 'G.711ulaw') {
			iAudioType = 1;
		} else if(this._m_szaudioCompressionType == "G.711alaw") {
			iAudioType = 2;
		} else if(this._m_szaudioCompressionType == "G.726") {
			iAudioType = 3;
		} else {
			iAudioType = 0;
		}
		var iTalk = PlayOCX.HWP_StartVoiceTalk(szOpenURL, szCloseURL, szDataUrl, this.m_szUserPwdValue, parseInt(iAudioType));
		if(iTalk == 0) {
			$("#voiceTalk").attr("src", "../images/public/ICON/speak_sound_normal.png");
			$("#voiceTalk").attr("title", this.getNodeValue("StopvoiceTalk"));
			this.m_bTalk =1;
		} else {
			var iError = g_oCommon.m_PreviewOCX.HWP_GetLastError();
			if(iError === 403) {
				alert(this.getNodeValue('jsNoOperationRight'));
			} else {
				alert(this.getNodeValue('VoiceTalkFailed'));
			}
		}
		$.modal.impl.close();
    },
	
	//获取左边树table(预览/回放)
    getTreeTable: function () {
		var innerHTML = $("#content_left").html();
		innerHTML = innerHTML + "<table cellspacing='0' cellpadding='0' style='width:200px; height:100%; border-collapse:collapse; border:1px solid #9b9b9b;'><tr style='width:200px;height:8px;'><td style='width:8px;height:8px;'></td><td style='width:184px;height:8px;'></td><td style='width:8px;height:8px;'></td></tr><tr style='width:200px;height:30px;'><td style='width:8px;height:30px;'></td><td style='width:184px;height:30px;'><div id='Device' class='ellipsis'>&nbsp; <img src='../images/public/ICON/DVR.png' /> <span id='DeviceName' style='-moz-user-select:none;' onselectstart='return false;'></span></div></td><td style='width:8px;height:30px; '></td></tr><tr style='width:200px;height:auto;'><td style='width:8px;height:auto; '></td><td valign='top' style='width:184px;height:auto;background:#dbdbdb;_height: expression((documentElement.clientHeight - 100) + \"px\");'><div id='sub_menu'></div></td><td style='width:8px;height:auto;'></td></tr><tr style='width:200px;height:8px;'><td style='width:8px;height:8px; '></td><td style='width:184px;height:8px;'></td><td style='width:8px;height:8px;'></td></tr></table>";
		$("#content_left").html(innerHTML);	
    }
}
// var g_oCommon = new Common();
/*************************************************
Function:		Base64
Description:	Base64加密解密
Input:			无		
Output:			无
return:			无				
*************************************************/
export const Base64 = {
	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	// public method for encoding
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
		input = Base64._utf8_encode(input);
		while (i < input.length) {
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}
			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
		} 
		return output;
	},
	// public method for decoding
	decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		while (i < input.length) {
			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
			output = output + String.fromCharCode(chr1);
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
		}
		output = Base64._utf8_decode(output);
		return output;
	},
	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
		for (var n = 0; n < string.length; n++) {
			var c = string.charCodeAt(n);
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
		}
		return utftext;
	},
	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;
		while ( i < utftext.length ) {
			c = utftext.charCodeAt(i);
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}
		return string;
	} 
}
/*************************************************
Function:		alert
Description:	重载页面弹出提示框
Input:			str:提示信息
Output:			无
return:			无				
*************************************************/
var g_isAlertDlgOpen = false;
//if( !(navigator.userAgent.indexOf("Safari") > 0) )//判断是否为firefox
if(navigator.userAgent.indexOf("Firefox") > 0) {
    window.alert = function(str) {
		if(!g_isAlertDlgOpen) {
			var msgw,msgh,bordercolor;
			msgw=300;//提示窗口的宽度
			msgh=120;//提示窗口的高度
			bordercolor="#336699";//提示窗口的边框颜色
			titlecolor="#235cdb";//提示窗口的标题颜色
					
			var sWidth,sHeight;
			sWidth=document.body.offsetWidth;
			sHeight=document.body.offsetHeight;
		
			var bgIframeObj=document.createElement("iframe");
			bgIframeObj.style.position="absolute";
			bgIframeObj.style.top=(document.documentElement.scrollTop + (sHeight-msgh)/2) + "px";
			bgIframeObj.style.left=(sWidth-msgw)/2 + "px";
			bgIframeObj.style.zIndex = 1003;
			bgIframeObj.style.background="#777";
			bgIframeObj.style.width=298 + "px";
			bgIframeObj.style.height=118 + "px";
			document.body.appendChild(bgIframeObj);
					
			var bgObj=document.createElement("div");
			bgObj.setAttribute('id','bgDiv');
			bgObj.style.position="absolute";
			bgObj.style.top="0";
			bgObj.style.left="0";
			bgObj.style.background="#777";
			bgObj.style.filter="progid:DXImageTransform.Microsoft.Alpha(style=3,opacity=25,finishOpacity=75";
			bgObj.style.opacity="0.6";
			bgObj.style.width=sWidth + "px";
			bgObj.style.height=sHeight + "px";
			document.body.appendChild(bgObj);
					
			var msgObj=document.createElement("div")
			msgObj.setAttribute("id","msgDiv");
			msgObj.setAttribute("align","center");
			msgObj.style.position="absolute";
			msgObj.style.background="#ece9d8";
			msgObj.style.font="12px/1.6em Verdana, Geneva, Arial, Helvetica, sans-serif";
			msgObj.style.border="1px solid " + bordercolor;
			msgObj.style.width=msgw + "px";
			msgObj.style.height=msgh + "px";
			msgObj.style.top=(document.documentElement.scrollTop + (sHeight-msgh)/2) + "px";
			msgObj.style.left=(sWidth-msgw)/2 + "px";
			msgObj.style.zIndex = 1004;
			
			var title=document.createElement("h4");
			title.setAttribute("id","msgTitle");
			title.setAttribute("align","right");
			title.style.margin="0";
			title.style.padding="3px";
			title.style.background=bordercolor;
			title.style.filter="progid:DXImageTransform.Microsoft.Alpha(startX=20, startY=20, finishX=100, finishY=100,style=1,opacity=75,finishOpacity=100);";
			title.style.opacity="0.75";
			title.style.border="1px solid " + bordercolor;
			title.style.height="18px";
			title.style.font="12px Verdana, Geneva, Arial, Helvetica, sans-serif";
			title.style.color="white";
			title.style.cursor="pointer";
			title.innerHTML="X";
			title.onclick = function() {
			    document.body.removeChild(bgObj);
				document.body.removeChild(bgIframeObj);
				document.getElementById("msgDiv").removeChild(title);
				document.body.removeChild(msgObj);
				g_isAlertDlgOpen = false;
			}		  
			document.body.appendChild(msgObj);
			document.getElementById("msgDiv").appendChild(title);
			var txt=document.createElement("p");
			txt.style.margin="1em 0"
			txt.setAttribute("id","msgTxt");
			txt.innerHTML=str;
			document.getElementById("msgDiv").appendChild(txt);
			var input = document.createElement("input");
			input.setAttribute("type","button");
			if(parent.translator.szCurLanguage.split("_")[0].toLowerCase() == 'zh') {
				input.setAttribute("value","确定");
			} else {
				input.setAttribute("value","OK"); 
			}
			input.style.width = "100px";
			input.style.position="absolute";
			input.style.top= 90+ "px";
			input.style.left=100 + "px";
			input.onclick = function() {
				document.body.removeChild(bgObj);
				document.body.removeChild(bgIframeObj);
				document.getElementById("msgDiv").removeChild(title);
				document.body.removeChild(msgObj);
				g_isAlertDlgOpen = false;
			}
			document.getElementById("msgDiv").appendChild(input);
			g_isAlertDlgOpen = true;
		}
    }
}
/*************************************************
Function:		replaceAll
Description:	替换所有
Input:			szDir:源字符
				szTar:目标字符
Output:			无
return:			无
*************************************************/
String.prototype.replaceAll = function(szDir,szTar) {
	var szStr = this;
	while(szStr.indexOf(szDir)>=0) {
		szStr = szStr.replace(szDir, szTar);
	}
	return szStr;
}
// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function (fmt) {
	var o= {
		"M+":this.getMonth()+1,//月份
		"d+":this.getDate(),//日
		"h+":this.getHours(),//小时
		"m+":this.getMinutes(),//分
		"s+":this.getSeconds(),//秒
		"q+":Math.floor((this.getMonth()+3)/3),//季度
		"S":this.getMilliseconds()//毫秒
	};
	if(/(y+)/.test(fmt))
	fmt=fmt.replace(RegExp.$1,(this.getFullYear()+"").substr(4-RegExp.$1.length));
	for(var k in o)
	if(new RegExp("("+k+")").test(fmt))
	fmt=fmt.replace(RegExp.$1,(RegExp.$1.length==1)?(o[k]):(("00"+o[k]).substr((""+o[k]).length)));
	return fmt;
}