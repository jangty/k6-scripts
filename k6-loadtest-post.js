import http from 'k6/http';
import { check, sleep, group  } from 'k6';
import { Counter } from 'k6/metrics'; 

// 에러 카운터를 생성합니다.
export const errors = new Counter('http_errors');

// k6 실행시 환경변수 전달 
// ex) k6 run -e RAMPUP=15s -e DURATION=60s -e TARGET=1000 test.js
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
  
*/
const BASE_URL = 'https://';

export default function () {
    let res;
    let headers;
    let payload;

    let encryptedTelNo;
    let encryptedBirthDe;

    group("API: Encrypt User Info", function() {
        headers = { 'Content-Type': 'application/json' };

    //    var params = {
    //      headers: {
    //        'Content-Type': 'application/json',
    //      },
    //    };
        payload = JSON.stringify({
            "telNo": "01000001234",
            "birthDe": "19901234"
        });

        //res = http.post(`${BASE_URL}/api/ucessPartners/UPA000`, payload, params);
        res = http.post(`${BASE_URL}/api/ucessPartners/UPA000`, payload, {headers});
        //console.info(res);

        if (res.status !== 200) {
            errors.add(1);
        }

        let resHeader = res.json('header');
        //console.info(resHeader.resultCode);

        let resBody = res.json('body');
        //console.info(resBody);
        encryptedTelNo = resBody.encryptedTelNo;
        encryptedBirthDe = resBody.encryptedBirthDe;
        //console.info(encryptedBirthDe);

        check(res, {
            'is status 200': r => r.status === 200,
            'is resultCoce 0000': r => r.json('header').resultCode === '0000',
        }) || errors.add(1); // 실패하면 에러 카운트 증가

        sleep(1);
    });

    group("API: Search member exist", function() {

        payload = JSON.stringify({
          "serviceKey": "AAHVccLbdvN1Le+Ig==",
          "telNo" : encryptedTelNo,
          "birthDe" : encryptedBirthDe
        });
    
        let resHeader = res.json('header');
        //console.info(resHeader.resultCode);

        res = http.post(`${BASE_URL}/api/ucessPartners/UPA001`, payload, {headers});
        //console.info(res);

        if (res.status !== 200) {
            errors.add(1);
        }
        
        check(res, {
            'is status 200': r => r.status === 200,
            'is resultCoce 0000': r => r.json('header').resultCode === '0000',
        }) || errors.add(1); // 실패하면 에러 카운트 증가

        sleep(1);
    });
}
    
