const _url = "https://www.naver.com/";
const webdriver = require('selenium-webdriver');
const fs = require('fs');
const request = require('request');
const { Key, By, until } = webdriver;

const CommentToPost = async (cafeId, id, cookies) => {
  return new Promise((resolve) => {
    const setCookies = cookies.map((ele) => {
      return `${ele.name}=${ele.value}`
    })
    const makingCookie = setCookies.join(';');
    const options = {
      uri: 'https://apis.naver.com/cafe-web/cafe-mobile/CommentPost.json',
      method: 'POST',
      headers: {
        'cookie': makingCookie,
        "Content-Type": "application/x-www-form-urlencoded",
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
        resolve();
      }
    })
  })
}

const GetNewPostList = async (clubid, menuid) => {
  return new Promise((resolve) => {
    request(
      `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${clubid}&search.queryType=lastArticle&search.menuid=${menuid}&search.page=1&search.perPage=1&ad=true&uuid=d550e453-565c-4cf5-892f-dbd4be7973f4&adUnit=MW_CAFE_ARTICLE_LIST_RS`
      , function (error, response, body) {
        if (!error && response.statusCode == 200) {
          const articleList = JSON.parse(body).message.result.articleList;
          if (JSON.parse(body).message === undefined) {
            return resolve({ id: 0 })
          }
          console.log(articleList[0].item.articleId);
          return resolve({ id: articleList[0].item.articleId });
        }
      })
  })
}

//spdlqj fhrmdls
const Nlogin = async (driver, nid, npw) => {
  return new Promise(async (resolve) => {
    //eorl (dkdlel qlqjs)
    await driver.wait(until.elementLocated(By.css('#id')));
    await driver.wait(until.elementLocated(By.css('#pw')));

    //dkdlel qlqjs dlqfur
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

    await driver.get("https://nid.naver.com/nidlogin.login?mode=form&url=https%3A%2F%2Fwww.naver.com");
    await Nlogin(driver, config.user_id, config.user_pw);
    while (1) {
      const { id: newId } = await GetNewPostList(config.cafe_id, config.menu_id);
      if (id === 0 || id == newId) {
        id = newId;
        console.log("searching… ", new Date().getSeconds(), new Date().getMilliseconds());
        continue;
      }
      id = newId;
      console.log("get new post", new Date().getSeconds(), new Date().getMilliseconds());
      const url = `https://m.cafe.naver.com/ca-fe/web/cafes/${config.cafe_id}/articles/${newId}?fromList=true`;
      await driver.get(url);
      let waiting = true
      while(waiting){
        await driver.wait(until.elementLocated(By.className('se-oglink-info')));
        const formLinkEles = await driver.findElements(By.className('se-oglink-info'));
        for (formLinkEle of formLinkEles) {
          const link = await formLinkEle.getAttribute('href');
          if(link.includes("naver.me")) {
            await driver.get(link);
            waiting = false;
            break;
          }
        }
      }
     
      // 핸드폰 번호
      try {
        await driver.findElement(By.xpath("//input[@title='처음 번호']")).sendKeys(config.phone_first);
        await driver.findElement(By.xpath("//input[@title='가운데 번호']")).sendKeys(config.phone_middle);
        await driver.findElement(By.xpath("//input[@title='마지막 번호']")).sendKeys(config.phone_last); 
      } catch(ex){
        console.log(ex);
      }
      // 나머지 폼
      try {
        const allInputHeaders = await driver.findElements(By.className('formItemPh text'))
        // await Promise.all(allInputHeaders.map(async (inputHeader)=>{
        for (const inputHeader of allInputHeaders){
          try {
            const title = await inputHeader.findElement(By.css('span[role="heading"]')).getText()
            let sendVal = "";
            if (title.includes("이름")) {
              sendVal = config.user_name;
            } else if (title.includes("월부닷컴") || title.includes("아이디")) {
              if (title.includes("성함")) {
                sendVal = config.user_name;
              } else {
                sendVal = config.user_id;
              }
            } else if (title.includes("email") || title.includes("이메일")) {
              sendVal = config.email;
            } else if (title.includes("닉네")) {
              sendVal = config.nick_name;
            }
            await inputHeader.findElement(By.id("answer")).sendKeys(sendVal);
          }catch(ex){
            console.log(ex);
          }
        }
        // }));
        const allRadioHeaders = await driver.findElements(By.className('formItemPh singleChoice vertical'))
        // await Promise.all(allRadioHeaders.map(async (radioHeader)=>{
        for (const radioHeader of allRadioHeaders){
          try {
            const regex = /radio_label/
            const buttons = await radioHeader.findElements(By.css("span[id*='" + regex.source + "']"));
            // await Promise.all(buttons.map(async (button)=>
            for(const button of buttons){
              const text = await button.getText();
              if (text.includes("확인했습니다") || text.includes("카페공지") || (text.includes("동의") && !text.includes("미동의"))) {
                try{
                  console.log(text)
                  await driver.executeScript("arguments[0].scrollIntoView();", button);
                  await button.click();
                }catch(ex){
                  console.log(ex);
                }
              }
            }
            // ))
          }catch(ex){
            console.log(ex);
          }
        }
        // }));
      } catch(ex){
        console.log(ex);
      }
    }
  } catch (err) {
    console.log("자동화 도중 에러 ", err + " 에러메시지 끝 ");
    for(;;){}
  } finally {
    await driver.sleep(2000);
    await driver.quit();
  }
})();
