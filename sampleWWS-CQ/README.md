概要：
Watson Workspaceでチャットボットの実装を行うアプリケーションサンプルです。

app.jsの以下の部分をご自身の値に置き換えてください。


以下はWatson Assistantの情報です。

var assistant = new watson.AssistantV1({

  username: ' {your_username}',
  
  password: '{your_password}',
  
  version: '2018-02-16'
  
});

var WORKSPACE_ID = "{your_WORKSPACE_ID}";


以下はWatson Workspaceのアプリの情報です。

var APP_ID = "{your_APP_ID}";

var APP_SECRET = "{your_APP_SECRET}";

var SPACE_ID = "{your_SPACE_ID}";

var APP_WEBHOOK_SECRET = "{your_APP_WEBHOOK_SECRET}";
