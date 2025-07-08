import http from 'k6/http';
import { check, sleep, group } from 'k6';

const loginData = JSON.parse(open("./senario1-smoke-users.json"));  //사용자 데이터를 로드

export const options = {
    stages: [
        { duration: __ENV.RAMPUP   || '10s', target: __ENV.TARGET ? parseInt(__ENV.TARGET) : 100 },
        { duration: __ENV.DURATION || '5m',  target: __ENV.TARGET ? parseInt(__ENV.TARGET) : 100 },
        { duration: __ENV.RAMPUP   || '10s', target: 0 },
    ],
    // 필요시 성능 목표 임계치 설정
    thresholds: {
        http_req_failed: ['rate<0.001'], // 성능 목표 임계치 : 에러율 0.1% 이하
        http_req_duration: ['p(95)<1000'], // 성능 목표 임계치 : 95%응답 1s 이하
    },
    summaryTrendStats: ['p(95)', 'avg', 'min', 'max'],
    noConnectionReuse: true, // disable keep-alive connections
    insecureSkipTLSVerify: true // SSL/TLS 인증서 검증 무시
};

/*
    1. 로그인 : https://
    2.  좌석선택
    3. 결재 1/3 : https:
    4. 결재 2/3 : https:
    5. 결재 3/3 : https:
    6. 포인트 조회
    7. 포인트 사용
    8. 최종 결재금액 체
    9. 현금영수증 체크 :
    10. 예매번호 생성 : 
    11. 결제처리 : https
    12. 결제 완료 페이지
    13. 결제 취소 호출 :

*/
const BASE_URL = 'https://';

export default function () {
    let res;
    let headers;
    let payload;
    let body;
    let resHeaders;

    // mega
    let transNo;
    let restPoint;
    let seatUniqNo;
    let userInfo;

    // 1. 로그인
    ////////////////////////////////////////////////////////////////////////////////////////////
    group("login", function() {
        console.info("step 1: login");
        headers = { 'Content-Type': 'application/json' }; // object

        let position = Math.floor(Math.random() * loginData.users.length);
        userInfo = loginData.users[position];

        payload = JSON.stringify({ // JavaScript 객체 리터럴 -> JSON 문자열로 변환
            // "loginId" : "namik9233",
            "loginId" : userInfo.username,
            "loginPwd" : "screen1!1111",
        });

        console.info(userInfo.username);
        console.info(userInfo.playSchdlNo);
        console.info(userInfo.seatOccupText);
        res = http.post(`${BASE_URL}/on/oh/ohg/MbLogin/selectMbLoginInfo.rest`, payload, {headers});
        // console.info(res);
        // console.info(res.headers);
        // console.info(res.cookies);
        // console.info(res.status);
        // console.info(res.cookies['JSESSIONID']);
        // console.info(res.cookies['JSESSIONID'][0].value);
        
        // let jsessionid = res.cookies['JSESSIONID'][0].value;
        // console.info(jsessionid);
        let session = res.cookies['SESSION'][0].value; // cookies 는 배열 []로 return됨.
        // console.info(session);
        // let wmonid = res.cookies['WMONID'][0].value;
        // console.info(wmonid);

        
        resHeaders = {
        //    'Content-Type': 'application/json',
           //'Cookie': 'JSESSIONID='+jsessionid
        //    'Cookie': 'JSESSIONID=' + jsessionid + '; SESSION=' + session + '; WMONID=' + wmonid
            'Cookie': 'SESSION='+session  
        }

        // resHeaders = {
        //     'Content-Type': 'application/json',
        //     'Cookie': '_ga=GA1.1.1195416728.1716337664; WMONID=' + wmonid + '; ch-veil-id=8db6e723-1643-4af5-bad6-9c87ab9db5f8; _ga_5JL3VPLV2E=GS1.1.1717110996.5.1.1717111847.51.0.0; _ga_LKZN3J8B1J=GS1.1.1717110996.5.1.1717111847.0.0.0; SESSION=' + session + '; JSESSIONID=' + jsessionid + '; _ga_MLS6F37TQM=GS1.1.1717119560.6.1.1717119582.38.0.0'
        // }
        // console.info(resHeaders);


        // JSON은 기본적으로 String 타입, 자바스크립트에서 처리필요시 객체로 변환 필요
        //let resCookies = JSON.parse(res.cookies); // Json 데이터 구문 분석
        //console.info(resCookies);
        //console.info(resHeader.resultCode);
        // let jsessionid = loginRes.cookies['JSESSIONID'][0].value;
        // console.info("res.cookies: " + JSON.stringify(res.cookies));

        let resBody = JSON.parse(res.body);
        // let rstMsg = resBody.msg;
        console.info(resBody.statCd);

        check(res, {
            'is status 200': r => r.status === 200,
            // 'is statCd 0': r => resBody.statCd === 0
            // 'is msg contain 정상': r => rstMsg.indexOf("정상") !== -1
        });
        sleep(Math.random());
    });


    group("session check", function() {
        console.info("step : session check")
        // headers = { 'Content-Type': 'application/json' };
        payload = JSON.stringify({
            
        });

        res = http.post(`${BASE_URL}/sessionChk.do`, payload, {resHeaders});
        
        let resBody = JSON.parse(res.body);
        //console.info(resBody.statCd);

        check(res, {
            'is status 200': r => r.status === 200,
            'is loginYn Y': r => resBody.loginYn == 'Y'
        });
        sleep(Math.random());
    });

    // 2. 상영스케쥴 좌석 선택
    group("Select Seat", function() {

        console.info("step 2: Select Seat");
        payload = JSON.stringify({
            "brchNo" : "",
            "hotDealEventNo" : "",
            "playSchdlNo" : userInfo.playSchdlNo
            
        });

        res = http.post(`${BASE_URL}/on/oh/ohz/PcntSeatChoi/selectSeatList.do`, payload, {resHeaders});
        //console.info(res);

        let resBody = JSON.parse(res.body);
        let rstMsg = resBody.msg;
        // console.info(resBody.statCd);

        check(res, {
            'is status 200': r => r.status === 200,
            'is msg contain 정상': r => rstMsg.indexOf("정상") !== -1
        });

        sleep(Math.random());
    });

    // 3. 결재1/3
    group("Payment 1", function() {

        console.info("step 3. Payment 1");
        payload = JSON.stringify({
            "BokdBrch" : "1351"
            , "BokdCnt" : 1
            , "entrpMbCd" : ""
            , "googleNetErrorAt" : "Y"
            , "playSchdlNo" : userInfo.playSchdlNo
            , "seatOccupText" : userInfo.seatOccupText
            , "tkeYn" : "N"
            , "token" : ""
            , "totalAmt" : 15000   


        });
            
        res = http.post(`${BASE_URL}/prePaymentCheck`, payload, {resHeaders});
        // console.info(res);

        let resBody = JSON.parse(res.body);
        let rstMsg = resBody.msg;
        // console.info(resBody.statCd);

        transNo = resBody.transNo;
        console.info(transNo);

        check(res, {
            'is status 200': r => r.status === 200,
            'is statCd 0': r => resBody.statCd === 0
            // 'is msg contain 정상': r => rstMsg.indexOf("정상") !== -1
        });

        sleep(Math.random());
    });

    // 4. 결재2/3
    
}
    
