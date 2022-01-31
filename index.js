const _url = "https://www.naver.com/"; 
const webdriver = require('selenium-webdriver'); 
const fs = require('fs');
const {By,until} = webdriver; 

const CommentToPost = async (driver, defaultHandle) => {
    //새탭 핸들값 저장 및 핸들 값 새탭으로 변경
    let windows = await driver.getAllWindowHandles();
    windows.forEach(async handle => {
        if (handle !== defaultHandle) {
            await driver.switchTo().window(handle);
        }
    });
    //글입력 대기
    await driver.wait(until.elementLocated(By.css('.comment_inbox_text')));
    const inputElem =await driver.findElement(By.css('.comment_inbox_text'));
    inputElem.sendKeys("감사합니다.")

    //업로드 버튼 클릭
    let btnArea = await driver.findElement(By.className('btn_register'));
    await btnArea.click();

    // await driver.sleep(3500);

    // await driver.close();
    //console.log('새탭 닫기 / 핸들 변경');
}

const GetNewPostList = async (driver, defaultHandle, prev,manu_id) => {
    //새탭 핸들값 저장 및 핸들 값 새탭으로 변경
    let windows = await driver.getAllWindowHandles();
    windows.forEach(async handle => {
        if (handle !== defaultHandle) {
            await driver.switchTo().window(handle);
        }
    });
    //현재 URL 얻기
    let next = prev;
    let currentUrl = await driver.getCurrentUrl();
    for(;;){
        await driver.wait(until.elementLocated(By.css('#main-area')));
        await driver.wait(until.elementLocated(By.name('cafe_main')));
        const elem =await driver.findElement(By.name('cafe_main'));
        driver.switchTo().frame(elem);
        await driver.wait(until.elementLocated(By.css('.td_article')));
        const elems = await driver.findElements(By.css('.td_article'));
        await driver.wait(until.elementLocated(By.css('.inner_number')));
        let idx = 0; //공지글이 아닌 최초 글
        for (i=0;i<elems.length;i++) {
            try {
                await elems[i].findElement(By.css('.inner_number'));
                idx = i;
                break;
            } catch(ex) {
                console.log(i);
            }
        }
        const a = await elems[idx].findElement(By.css('.inner_number'));
        const id = await a.getText();
        console.log(`id: ${id}`)
        console.log(new Date());
        if ( id == next || next == "" ) {
            next = id;
            driver.switchTo().window(defaultHandle);
            await driver.wait(until.elementLocated(By.css(`#`+manu_id)));// 게시판 링크 클릭
            const loginSubmit = await driver.findElement(By.css(`#`+manu_id));// 게시판 링크 클릭
            await loginSubmit.click();
        } else {
            next = id;
            await elems[idx].findElement(By.css('.article')).click();
            return {code: 0, id: next, url: currentUrl};
        }
    }

    // await driver.close();
    //console.log('새탭 닫기 / 핸들 변경');
}

//네이버 로그인
const Nlogin = async (driver,nid,npw)=>{
    //대기 (아이디 비번)
    await driver.wait(until.elementLocated(By.css('#id')));
    await driver.wait(until.elementLocated(By.css('#pw')));

    //아이디 비번 입력
    await driver.executeScript(`
        document.querySelector('#id').value = '${nid}';
        document.querySelector('#pw').value = '${npw}';
    `);

    await driver.wait(until.elementLocated(By.css('.btn_login')));

    const loginSubmit = await driver.findElement(By.css(`.btn_login`));
    await loginSubmit.click();
}

//카페 들어가기
const Cafein = async (driver,defaultHandle, id)=>{
    //대기 (아이디 비번)
    let windows = await driver.getAllWindowHandles();
    windows.forEach(async handle => {
        if (handle !== defaultHandle) {
            await driver.switchTo().window(handle);
        }
    });
    await driver.wait(until.elementLocated(By.css('#' + id)));//게시판 링크 찾기

    const loginSubmit = await driver.findElement(By.css(`#`+id));// 게시판 링크 클릭
    await loginSubmit.click();
}

(async () => { 
    const driver = await new webdriver.Builder().forBrowser('chrome').build(); 
    try { 
        let id = "";
        const config = JSON.parse(fs.readFileSync("./config.json"));
        const defaultHandle = await driver.getWindowHandle();

        await driver.get("https://nid.naver.com/nidlogin.login?mode=form&url=https%3A%2F%2Fwww.naver.com"); 
        await Nlogin(driver,config.user_id,config.user_pw);
        while(1){
            await driver.get("https://cafe.naver.com/" + config.cafe_id); 
            await Cafein(driver, defaultHandle, config.menu_id);
            const { code, id:newId, url } = await GetNewPostList(driver, defaultHandle, id, config.menu_id);
            id = newId;
            if(code == 0 ) {
                await CommentToPost(driver, defaultHandle);
            }
        }
    } catch(err){ 
        console.log("자동화 도중 에러 ",err + " 에러메시지 끝 "); 
    } finally { 
        await driver.sleep(2000); 
        await driver.quit(); 
    } 
})();
