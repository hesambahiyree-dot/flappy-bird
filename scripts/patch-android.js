import fs from "node:fs";
import path from "node:path";
const root=path.resolve("android");
const pkg=path.join(root,"app/src/main/java/com/sunsetballoon/app");
fs.mkdirSync(pkg,{recursive:true});
fs.writeFileSync(path.join(pkg,"MainActivity.java"),`package com.sunsetballoon.app;\n\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n  @Override public void onCreate(Bundle state) { super.onCreate(state); immersive(); }\n  private void immersive() { getWindow().setFlags(1024,1024); getWindow().getDecorView().setSystemUiVisibility(5894); }\n  @Override public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) immersive(); }\n}\n`);
const iconDir=path.join(root,"app/src/main/res/drawable-nodpi");fs.mkdirSync(iconDir,{recursive:true});fs.copyFileSync(path.resolve("public/assets/app-icon.png"),path.join(iconDir,"app_icon.png"));
const manifest=path.join(root,"app/src/main/AndroidManifest.xml");let xml=fs.readFileSync(manifest,"utf8");xml=xml.replace(/android:icon="[^"]*"/g,'android:icon="@drawable/app_icon"');xml=xml.replace(/android:roundIcon="[^"]*"/g,'android:roundIcon="@drawable/app_icon"');xml=xml.replace(/<activity android:name="\.MainActivity"(?![^>]*android:screenOrientation)/,'<activity android:name=".MainActivity" android:screenOrientation="portrait"');fs.writeFileSync(manifest,xml);
