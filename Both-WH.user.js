// ==UserScript==
// @name        Both-WH ⭐
// @namespace        http://tampermonkey.net/
// @version        3.4
// @description        「通常表示」「HTML表示」のカーソル位置を「Ctrl+F8」で往復する
// @author        Ameba Blog User
// @match        https://blog.ameba.jp/ucs/entry/srventry*
// @exclude        https://blog.ameba.jp/ucs/entry/srventrylist.do*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=ameblo.jp
// @grant        none
// @updateURL        https://github.com/personwritep/Both-WH/raw/main/Both-WH.user.js
// @downloadURL        https://github.com/personwritep/Both-WH/raw/main/Both-WH.user.js
// ==/UserScript==


let retry=0;
let interval=setInterval(wait_target, 100);
function wait_target(){
    retry++;
    if(retry>10){ // リトライ制限 10回 1sec
        clearInterval(interval); }
    let target=document.getElementById('cke_1_contents'); // 監視 target
    if(target){
        clearInterval(interval);
        main(); }}


function main(){
    let editor_iframe;
    let iframe_doc;
    let wysiwyg; // 通常表示の iframe内 html
    let native_line; // 通常表示のスクロール位置
    let selection;
    let range;
    let insert_node;
    let mark_regex;
    let activeline;
    let codemirror_scroll;


    let target=document.getElementById('cke_1_contents'); // 監視 target は3箇所で共用
    let monitor1=new MutationObserver( catch_key );
    monitor1.observe(target, {childList: true}); // ショートカット待受け開始

    catch_key();

    function catch_key(){
        if(document.querySelector('.cke_wysiwyg_frame') !=null){ //「通常表示」から実行開始
            editor_iframe=document.querySelector('.cke_wysiwyg_frame');
            iframe_doc=editor_iframe.contentWindow.document;

            if(iframe_doc.querySelector('#i')){
                iframe_doc.querySelector('#i').remove(); } // 安全モードの場合に通常表示に戻り自動削除🔴

            iframe_doc.addEventListener('keydown', check_key);
            function check_key(event){
                if(event.which==17 || event.ctrlKey==true){
                    if(event.which==119 || event.keyCode==119){ set_mark(); }}}


            function set_mark(){
                selection=iframe_doc.getSelection();
                range=selection.getRangeAt(0);
                insert_node=iframe_doc.createElement("i"); // iタグ 空タグ
                insert_node.appendChild(iframe_doc.createTextNode("\u200B"));
                insert_node.setAttribute("id", "i");
                range.insertNode(insert_node); // カーソル位置にマークタグを書き込む

                wysiwyg=iframe_doc.querySelector('html');
                native_line=wysiwyg.scrollTop; // 通常表示のスクロール位置を記録

                let html_button=document.querySelector('button[data-mode="source"]');
                html_button.click( in_CodeMirror() ); // HTML表示に移動 🟦

                function in_CodeMirror(){
                    let monitor2=new MutationObserver( task_CodeMirror );
                    monitor2.observe(target, {childList: true});

                    function task_CodeMirror(){
                        if(document.querySelector('.CodeMirror-activeline pre')){ // アクティブ行が条件
                            function key_in(key_Code){
                                let keyEvent=new KeyboardEvent('keydown', {keyCode: key_Code});
                                document.querySelector('.CodeMirror textarea').dispatchEvent(keyEvent); }
                            mark_regex=RegExp('<i id="i">•</i>');

                            for(let j=0; j<120; j++){
                                let code=document.querySelector('.CodeMirror-code');
                                if(mark_regex.test(code.textContent)==true ){ break; }
                                else{ key_in(34); }} // PageDownで検索エリアを探す

                            let line_count=0;
                            for(let j=0; j<3000; j++){
                                activeline=document.querySelector('.CodeMirror-activeline pre');
                                if(mark_regex.test(activeline.textContent)==true ){ break; }
                                else{ line_count +=1; key_in(40); }} // Down でアクティブ行を下方へ移動

                            let index_uni=activeline.textContent.indexOf('<i id="i">•</i>'); // unicode16の文字数
                            let real=activeline.textContent.match(/./ug); // サロゲートペアを1文字に文字列を配列化
                            // console.log('real：　' + real); // 配列チェック用のメンテナンスコード 🔴

                            let sur=0; // サロゲートペア文字補正値
                            for(let k=0; k<index_uni; k++){
                                let str=real.slice(index_uni - k, index_uni - k +15).join('');
                                if(str=='<i id="i">•</i>'){ sur=k; break; }}
                            index_uni -=sur; // サロゲートペア文字のズレ補正したindex

                            let vas=0; // 異体字の結合文字補正値
                            for(let k=0; k<index_uni; k++){
                                if(real[k]=='•'){ vas +=1; } // 組文字に使用されるゼロ幅接合子
                                if(real[k]=='\uFE0F'){
                                    if(real[k+1]=='\u20E3'){ vas +=2; } // 特殊な▢数字の異体字の場合
                                    else{ vas +=1; }} // 異体字に使用される結合文字
                                if(real[k]=='\uFE0E'){ vas +=1; }} // 異体字に使用される結合文字
                            index_uni -=vas; // 異体字結合文字のズレ補正したindex

                            let spa=0; // 行頭の半角空白によるindex補正値（Tab文字補正を含む）
                            for(let k=0; k<index_uni; k++){
                                if(activeline.textContent.indexOf('\u0020', k)==k ||
                                   activeline.textContent.indexOf('\u00A0', k)==k){
                                    spa+=1; }
                                else break; }
                            index_uni -=spa; // 行頭の半角空白によるズレ補正をしたindex

                            key_in(36); // brの改行で行頭の絵文字の後にカーソルが入る場合を修正する
                            for(let i=0; i<index_uni; i++){ key_in(39); } // アクティブ行内で右方へindex値だけ移動
                            let zero_stop=0; //「HTML表示」でマークタグ削除をしない安全モードは「1」に変更 🔴
                            if(zero_stop==1){ key_in(37); } // 左へ1文字移動するだけで マークタグを削除しない
                            else{
                                for(let i=0; i<15; i++){ key_in(46); }} // マークタグ文字列の15文字を削除

                            codemirror_scroll=document.querySelector('.CodeMirror-scroll');
                            let win_height=codemirror_scroll.clientHeight;
                            let styles=getComputedStyle(document.querySelector('.cm-bracket'));
                            let line_height=parseFloat(styles.lineHeight);
                            let scroll=0;
                            if(line_count*line_height>=0.4*win_height){
                                if(line_count*line_height>=win_height){ scroll=0.6*win_height; }
                                else{ scroll=line_count*line_height - 0.4*win_height; }}
                            codemirror_scroll.scrollTop +=scroll;

                            document.querySelector('.CodeMirror textarea').focus(); // 入力窓にカーソルを入れる
                            monitor2.disconnect(); } // task_CodeMirrorの終了で監視ループを抜ける
                    }} // in_CodeMirror
            } // set_mark
        } // WYSIWYG表示での場合


        else if(document.querySelector('.CodeMirror') !=null){ //「HTML表示」から実行開始
            document.querySelector('.CodeMirror').addEventListener('keydown', function(event){
                if(event.which==17 || event.ctrlKey==true){
                    if(event.which==119 || event.keyCode==119){ to_native_line(); }}});


            function to_native_line(){
                let wysiwyg_button=document.querySelector('button[data-mode="wysiwyg"]');
                wysiwyg_button.click( in_wysiwyg() ); // 通常表示に移動 🟦

                function in_wysiwyg(){
                    let monitor3=new MutationObserver( task_wysiwyg );
                    monitor3.observe(target, {childList: true});

                    task_wysiwyg();

                    function task_wysiwyg(){
                        if(document.querySelector('.cke_wysiwyg_frame') !=null){ //「通常表示」が条件
                            editor_iframe=document.querySelector('.cke_wysiwyg_frame');
                            iframe_doc=editor_iframe.contentWindow.document;
                            wysiwyg=iframe_doc.querySelector('html');

                            wysiwyg.scrollTop=native_line; // 記録された通常表示のスクロール位置に移動
                            if(wysiwyg.scrollTop==native_line){
                                monitor3.disconnect(); }}} // task_wysiwyg の終了で監視ループを抜ける
                } // in_wysiwyg
            } // to_native_line
        } // HTML表示での場合
    } // catch_key

}
