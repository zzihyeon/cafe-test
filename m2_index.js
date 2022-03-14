const _url = "https://www.naver.com/"; 
const webdriver = require('selenium-webdriver'); 
const fs = require('fs');
const request = require('request');
const { resolve } = require('path');
const {By,until} = webdriver; 

const CommentToPost = async (cafeId, id, cookies) => {
    return new Promise((resolve) => {
        const setCookies = cookies.map((ele)=>{
            return `${ele.name}=${ele.value}`
        })
        const makingCookie = setCookies.join(';')
        const options = { 
            uri: 'https://apis.naver.com/cafe-web/cafe-mobile/CommentPost.json',
            method: 'POST',
            headers:{
                'cookie':makingCookie,
                "Content-Type":"application/x-www-form-urlencoded",
            },
            form: {
                cafeId: cafeId,
                articleId: id,
                content: "1",
                stickerId: "",
                requestFrom: "B",
            }
        };
        request.post(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(JSON.parse(body));
            }
        })
    })
}

const GetNewPostList = async () => {
    return new Promise((resolve) => {
        request('https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=30638376&search.queryType=lastArticle&search.menuid=3&search.page=1&search.perPage=1&ad=true&uuid=d550e453-565c-4cf5-892f-dbd4be7973f4&adUnit=MW_CAFE_ARTICLE_LIST_RS', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                const articleList = JSON.parse(body).message.result.articleList;
                if (JSON.parse(body).message === undefined) {
                    return resolve({id: 0})
                }
                return resolve({id:articleList[0].item.articleId});
            }
        })
    })
}

//네이버 로그인
const Nlogin = async (driver,nid,npw)=>{
    return new Promise(async (resolve)=>{
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
        driver.manage().getCookies().then(function (cookies) {
            return resolve(cookies);
        });
    })
}

(async () => { 
    const driver = await new webdriver.Builder().forBrowser('chrome').build(); 
    try { 
        let id = 0;
        const config = JSON.parse(fs.readFileSync("./config.json"));
        const defaultHandle = await driver.getWindowHandle();

        await driver.get("https://nid.naver.com/nidlogin.login?mode=form&url=https%3A%2F%2Fwww.naver.com"); 
        const cookies = await Nlogin(driver,config.user_id,config.user_pw);
        while(1){
            const { id: newId } = await GetNewPostList(driver, defaultHandle, id, config.menu_id);
            if (id === 0 || id == newId) {
                id = newId;
                await (function () {
                    return new Promise((resolve)=>{
                        setTimeout(resolve,200);
                    })
                }
                )()
                continue;
            }
            id = newId;
            console.log(new Date().getSeconds(), new Date().getMilliseconds());
            await CommentToPost(config.cafe_id, newId, cookies);
            console.log(new Date().getSeconds(),new Date().getMilliseconds());
        }
    } catch(err){ 
        console.log("자동화 도중 에러 ",err + " 에러메시지 끝 "); 
    }  finally { 
        await driver.sleep(2000); 
        await driver.quit(); 
    } 
})();
