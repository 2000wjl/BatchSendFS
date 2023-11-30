// @ts-nocheck
import { bitable, UIBuilder, FieldType } from "@lark-base-open/js-sdk";
import { UseTranslationResponse } from 'react-i18next';
import axios from 'axios';

export default async function (uiBuilder: UIBuilder, { t }: UseTranslationResponse<'translation', undefined>) {

  uiBuilder.markdown(`
  ## ${t(34)}

  > ${t(35)}\`ontact:user.id:readonly im:message:send_as_bot\`${t(36)}

  [${t(37)}appId,appSecret](https://open.feishu.cn/app)
  `);

  uiBuilder.form(form => ({
    formItems: [
      form.select('select', { label: t(0), options: [{ label: t(1), value: 'text' }, { label: t(2), value: 'cardMessage' }], defaultValue: 'cardMessage' }),
    ],
    buttons: [t(3)],
  }), async ({ values: { select } }) => {
    //选择发送方式
    if (select === 'text') {
      //普通文本方式
      uiBuilder.markdown(`# ${t(1)}
      
  ${t(60)}\`@\`${t(55)}`);
      //普通文本方式表单
      uiBuilder.form((form) => ({
        formItems: [
          form.input('appId', { label: 'appId', placeholder: 'cli_xxxxxxxxxxxxxxxx' }),
          form.input('appSecret', { label: 'appSecret', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxx' }),
          form.tableSelect('table', { label: t(5) }),
          form.fieldSelect('userField', {
            label: t(6), sourceTable: 'table', multiple: false,
            filterByTypes: [FieldType.Phone]
          }),
          form.textArea('field', { label: t(7), sourceTable: 'table', multiple: true, placeholder: t(8) }),
          form.fieldSelect('valueField', {
            label: t(9), sourceTable: 'table', multiple: true,
          }),
          form.textArea('textArea', { label: t(10), placeholder: '】From xxxxxx' })
        ],
        buttons: [t(11), t(12)],
      }), async ({ key, values }) => {
        let { table, userField, valueField, field, textArea, appId, appSecret } = values;
        //开始加载数据
        uiBuilder.showLoading(t(13));
        
        //数据合法性校验
        const fieldArray = field?field.split("@"):"";
        if (!fieldArray || fieldArray.length - (valueField==undefined?0:valueField.length) !== 1) {
          //待发送数据合法性校验
          uiBuilder.message.error(t(15), 5)
          uiBuilder.hideLoading();
          return;
        }

        textArea = textArea==undefined?"":textArea;
        const recordList = await table.getRecordList();//所有行
        uiBuilder.hideLoading();

        //普通文本功能按钮
        if (key === t(12)) {
          uiBuilder.showLoading(t(16));
          //预览按钮
          var value = "";
          for (var i = 0; i < (valueField==undefined?0:valueField.length); i++) {//遍历第一行(随机取行号) 拼接模板
            const cell = await table.getCellValue(valueField[i].id, recordList.recordIdList[0]);
            const cellValue = Array.prototype.isPrototypeOf(cell) ? cell[0].text : cell.text
            value += fieldArray[i] + cellValue;
          }
          uiBuilder.hideLoading();
          uiBuilder.message.info(valueField==undefined?fieldArray+textArea:value + textArea, 5)
        } else {
          //推送按钮
          if (userField === undefined) {//联系方式判空
            uiBuilder.message.error(t(14), 5);
            uiBuilder.hideLoading();
            return;
          }
          if (appId === undefined) {//appId判空
            uiBuilder.message.error(t(56), 5);
            uiBuilder.hideLoading();
            return;
          }
          if (appSecret === undefined) {//appSecret判空
            uiBuilder.message.error(t(57), 5);
            uiBuilder.hideLoading();
            return;
          }
          uiBuilder.showLoading(t(17));

          //鉴权请求
          const getTokendata = JSON.stringify({
            "app_id": appId,
            "app_secret": appSecret
          });
          const headers = {
            headers: {
              'Content-Type': 'application/json'
            }
          };
          const getTokenResult = await axios.post('/api/open-apis/auth/v3/tenant_access_token/internal', getTokendata, headers)
              .catch(e=>{
                uiBuilder.message.error(t(19) + e.response.data.msg, 0);
              });

          //遍历所有行 查询用户 发送数据
          for (const record of recordList) {
            const cell = await record.getCellByField(userField.id);//获取联系方式字段
            const users = await cell.getValue();//获取联系方式字段的值
            if (users) {
              //查询用户请求
              const getUsersdata = JSON.stringify({
                "emails": [
                ],
                "mobiles": [
                  users
                ]
              });
              const tenacntAccessTokenHeaders = {
                headers: {
                  'Authorization': 'Bearer ' + getTokenResult.data.tenant_access_token,
                  'Content-Type': 'application/json'
                }
              };
              //查询用户请求
              const getUsersResult = await axios.post('/api/open-apis/contact/v3/users/batch_get_id?user_id_type=open_id', getUsersdata, tenacntAccessTokenHeaders)
                  .then(res=>{
                    if (!res.data.data.user_list[0].user_id) {
                      uiBuilder.message.error(t(22) + users + t(23), 10);
                    }
                    return res;
                  }).catch(e=>{
                    uiBuilder.message.error(t(21) + e.response.data.msg, 0);
                  })

              //拼接发送内容
              var value = "";
              for (var i = 0; i < (valueField==undefined?0:valueField.length); i++) {//遍历第一行(随机取行号) 拼接模板
                const cell = await table.getCellValue(valueField[i].id, record.id);
                const cellValue = Array.prototype.isPrototypeOf(cell) ? cell[0].text : cell.text
                value += fieldArray[i] + cellValue;
              }

              //发送信息请求
              const sendMsgData = JSON.stringify({
                "receive_id": getUsersResult.data.data.user_list[0].user_id,
                "msg_type": "text",
                "content": "{\"text\":\"" + (valueField===undefined?fieldArray:(value + textArea)) + "\"}"
              });
              uiBuilder.showLoading(t(24) + users + t(25));
              axios.post('/api/open-apis/im/v1/messages?receive_id_type=open_id', sendMsgData, tenacntAccessTokenHeaders).then(res=>{
                uiBuilder.message.success(t(24) + users + t(29), 5)
              }).catch(e=>{
                uiBuilder.message.error(t(27) + e.response.data.msg, 0);
              });
            }
          }
          uiBuilder.message.success(t(29), 5);
          uiBuilder.hideLoading();
        }
      });
    } else {
      //消息卡片方式
      uiBuilder.markdown(`# ${t(2)}  
[${t(53)}](https://open.feishu.cn/tool/cardbuilder)${t(54)}\`@\`${t(55)}
      `);
      uiBuilder.form((form) => ({
        formItems: [
          form.input('appId', { label: 'appId', placeholder: 'cli_xxxxxxxxxxxxxxxx' }),
          form.input('appSecret', { label: 'appSecret', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxx' }),
          form.tableSelect('table', { label: t(5) }),
          form.fieldSelect('userField', {
            label: t(6), sourceTable: 'table', multiple: false,
            filterByTypes: [FieldType.Phone]
          }),
          form.textArea('field', { label: t(30), sourceTable: 'table', multiple: true, placeholder: '{"config":{"wide_screen_mode":true},"header":{"template":"blue","title":{"tag":"plain_text","content":"@"...' }),
          form.fieldSelect('valueField', {
            label: t(9), sourceTable: 'table', multiple: true,
          })
        ],
        buttons: [t(11)],
      }), async ({ key, values }) => {
        const { table, userField, valueField, field, textArea, appId, appSecret } = values;
        //开始加载数据
        uiBuilder.showLoading(t(13));

        //数据合法性校验
        if (userField === undefined) {
          uiBuilder.message.error(t(14), 5);
          uiBuilder.hideLoading();
          return;
        }
        if (appId === undefined) {//appId判空
          uiBuilder.message.error(t(56), 5);
          uiBuilder.hideLoading();
          return;
        }
        if (appSecret === undefined) {//appSecret判空
          uiBuilder.message.error(t(57), 5);
          uiBuilder.hideLoading();
          return;
        }
        if (field === undefined) {//field判空
          uiBuilder.message.error(t(58), 5);
          uiBuilder.hideLoading();
          return;
        }else{
          if (!isJSON(field)) {
            uiBuilder.message.error(t(59), 5);
            uiBuilder.hideLoading();
            return;
          }
        }
        const fieldArray = field.replace(/[ ]|[\r\n]/g, "").split("@");//拆模板
        if (!fieldArray || fieldArray.length - (valueField==undefined?0:valueField.length) !== 1) {
          uiBuilder.message.error(t(15), 5)
          uiBuilder.hideLoading();
          return;
        }
        const recordList = await table.getRecordList();//所有行
        uiBuilder.hideLoading();

        //鉴权请求
        uiBuilder.showLoading(t(17));
        const getTokendata = JSON.stringify({
          "app_id": appId,
          "app_secret": appSecret
        });
        const headers = {
          headers: {
            'Content-Type': 'application/json'
          }
        };
        const getTokenResult = await axios.post('/api/open-apis/auth/v3/tenant_access_token/internal', getTokendata, headers)
            .catch(e=>{
              uiBuilder.message.error(t(19) + e.response.data.msg, 0);
            });

        //遍历所有行 查询用户 发送数据
        for (const record of recordList) {
          const cell = await record.getCellByField(userField.id);//获取联系方式字段
          const users = await cell.getValue();//获取联系方式字段的值
          if (users) {
            const getUsersdata = JSON.stringify({
              "emails": [
              ],
              "mobiles": [
                users
              ]
            });
            const tenacntAccessTokenHeaders = {
              headers: {
                'Authorization': 'Bearer ' + getTokenResult.data.tenant_access_token,
                'Content-Type': 'application/json'
              }
            };
            //查询用户请求
            const getUsersResult = await axios.post('/api/open-apis/contact/v3/users/batch_get_id?user_id_type=open_id', getUsersdata, tenacntAccessTokenHeaders)
                .then(res=>{
                  if (!res.data.data.user_list[0].user_id) {
                    uiBuilder.message.error(t(22) + users + t(23), 10);
                  }
                  return res;
            }).catch(e=>{
              uiBuilder.message.error(t(21) + e.response.data.msg, 0);
            })
            //拼接发送内容
            var value = "";
            for (var i = 0; i < (valueField==undefined?0:valueField.length); i++) {//遍历第一行(随机取行号) 拼接模板
              const cell = await table.getCellValue(valueField[i].id, record.id);
              const cellValue = Array.prototype.isPrototypeOf(cell) ? cell[0].text : cell.text
              value += fieldArray[i] + cellValue;
            }

            //发送信息
            const sendMsgData = JSON.stringify({
              "receive_id": getUsersResult.data.data.user_list[0].user_id,
              "msg_type": "interactive",
              "content": (valueField==undefined?field:(value + fieldArray[fieldArray.length - 1]))
            });
            uiBuilder.showLoading(t(24) + users + t(31));
            axios.post('/api/open-apis/im/v1/messages?receive_id_type=open_id', sendMsgData, tenacntAccessTokenHeaders).then(res=>{
              uiBuilder.message.success(t(24) + users + t(29), 5)
            }).catch(e=>{
                uiBuilder.message.error(t(27) + e.response.data.msg, 0);
            });
          }
        }
        uiBuilder.message.success(t(47), 5);
        uiBuilder.hideLoading();
      });
    }
  });
}

function isJSON(str) {
  if (typeof str == 'string') {
    try {
      var obj=JSON.parse(str);
      if(typeof obj == 'object' && obj ){
        return true;
      }else{
        return false;
      }

    } catch(e) {
      console.log('error：'+str+'!!!'+e);
      return false;
    }
  }
  return false;
}
