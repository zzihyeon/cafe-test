const _url = "https://www.naver.com/";
const webdriver = require('selenium-webdriver');
const fs = require('fs');
const request = require('request');
const { By, until } = webdriver;

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

//네이버 로그인
const Nlogin = async (driver, nid, npw) => {
  return new Promise(async (resolve) => {
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

    await driver.get("https://nid.naver.com/nidlogin.login?mode=form&url=https%3A%2F%2Fwww.naver.com");
    const cookies = await Nlogin(driver, config.user_id, config.user_pw);
    while (1) {
      const { id: newId } = await GetNewPostList(config.cafe_id, config.menu_id);
      if (id === 0 || id == newId) {
        id = newId;
        console.log("searching... ", new Date().getSeconds(), new Date().getMilliseconds());
        continue;
      }
      id = newId;
      console.log("get new post", new Date().getSeconds(), new Date().getMilliseconds());
      // await CommentToPost(config.cafe_id, newId, cookies);
      //TODO: 네이버 폼 찾아서 링크 열기
      //goto page
      const url = `https://m.cafe.naver.com/ca-fe/web/cafes/${config.cafe_id}/articles/${newId}?fromList=true`;
      await driver.get(url);
      // await driver.wait(until.elementLocated(By.className('se-table-content')));
      // const data = await driver.findElement(By.className('se-table-content')).getText();
      // console.log(data);
      await driver.wait(until.elementLocated(By.className('se-oglink-info')));
      const formLink = await driver.findElement(By.className('se-oglink-info')).getAttribute('href');

      await driver.get(formLink);

      // 폼 필드 값을 입력합니다.
      // await driver.findElement(By.name("이름")).sendKeys("김진숙"); // 이름 필드
      // await driver.findElement(By.name("핸드폰")).sendKeys("01025893353"); // 전화번호 필드
      // await driver.findElement(By.name("월부닷컴")).sendKeys("wlstnr969"); // 전화번호 필드
      try {
        await driver.findElement(By.className("phone1")).sendKeys("010"); // 전화번호 필드
        await driver.findElement(By.className("phone2")).sendKeys("2589"); // 전화번호 필드
        await driver.findElement(By.className("phone3")).sendKeys("3353"); // 전화번호 필드
      } catch(ex){
        console.log(ex);
      }

      for(;;){}
    }
  } catch (err) {
    console.log("자동화 도중 에러 ", err + " 에러메시지 끝 ");
    for(;;){}
  } finally {
    await driver.sleep(2000);
    await driver.quit();
  }
})();
