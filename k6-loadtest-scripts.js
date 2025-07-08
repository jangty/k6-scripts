import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// 에러 카운터를 생성합니다.
const errorCounter = new Counter('http_errors');
const successRate = new Rate('http_success_rate');

// k6 실행시 환경변수 전달 
// ex) k6 run -e RAMPUP=15s -e DURATION=60s -e TARGET=1000 test.js
export let options = {
    stages: [
        { duration: __ENV.RAMPUP || '10s', target: __ENV.TARGET ? parseInt(__ENV.TARGET) : 100 },
        { duration: __ENV.DURATION || '1m', target: __ENV.TARGET ? parseInt(__ENV.TARGET) : 100 },
        { duration: __ENV.RAMPDOWN || '10s', target: 0 }
    ],
    // 필요시 성능 목표 임계치 설정
    thresholds: {
        http_req_duration: ['p(95)<1500', 'p(99)<2000'],    // 성능 목표 임계치 : 95% 응답 1.5초 이하, 99% 응답 2초 이하
        http_req_failed: ['rate<0.01'], // 성능 목표 임계치 : 에러율 1% 이하
        http_success_rate: ['rate>0.99'],   // 성능 목표 임계치 : 성공률 99% 이상
        // http_errors: ['count<100']  // 성능 목표 임계치 : 에러 카운트 100 이하
    },
    summaryTrendStats: ['p(50)', 'p(95)', 'p(99)', 'avg', 'min', 'max'],    // 요약 통계: 50%, 95%, 99% 백분위수, 평균, 최소, 최대 응답 시간
    insecureSkipTLSVerify: true,    // SSL/TLS 인증서 검증 무시
    noConnectionReuse: false,   // 연결 재사용 비활성화
};

const BASE_URL = __ENV.BASE_URL || 'https://new-dev.koreadaily.com';

const API_ENDPOINTS = {
    homepage: {
        url: '/',
        method: 'GET',
        weight: 0.20,
        name: 'Homepage'
    },
    accidentSection: {
        url: '/section/accident',
        method: 'GET', 
        weight: 0.30,
        name: 'Accident Section'
    },
    searchResult: {
        url: '/section/searchResult',
        method: 'GET',
        weight: 0.30,
        name: 'Search Result'
    },
    search: {
        url: '/search',
        method: 'GET',
        weight: 0.10,
        name: 'Search'
    },
    allArticles: {
        url: '/section/allArticles',
        method: 'GET',
        weight: 0.10,
        name: 'All Articles'
    }
};

// 가중치 기반으로 API 엔드포인트를 선택하는 함수
function selectAPIByWeight() {
    // 0과 1 사이의 랜덤 값 생성
    const random = Math.random();
    // 누적 가중치를 저장할 변수 초기화
    let cumulativeWeight = 0;
    
    // API_ENDPOINTS 객체의 각 엔드포인트를 순회
    for (const [key, endpoint] of Object.entries(API_ENDPOINTS)) {
        // 현재 엔드포인트의 가중치를 누적 가중치에 더함
        cumulativeWeight += endpoint.weight;
        // 랜덤 값이 누적 가중치보다 작거나 같으면 해당 엔드포인트 선택
        if (random <= cumulativeWeight) {
            return { key, ...endpoint };
        }
    }
    
    // 예외 상황 처리: 첫 번째 엔드포인트 반환
    return Object.entries(API_ENDPOINTS)[0];
}

// 각 가상 사용자(VU)가 실행할 메인 함수
export default function () {
    // 가중치 기반으로 테스트할 엔드포인트 선택
    const selectedEndpoint = selectAPIByWeight();
    
    // 선택된 페이지별로 그룹화하여 메트릭 수집
    group(`Page: ${selectedEndpoint.name}`, function () {
        // 베이스 URL과 선택된 엔드포인트 URL 조합
        const url = `${BASE_URL}${selectedEndpoint.url}`;
        
        // HTTP GET 요청 실행
        const response = http.get(url);
        
        // 응답 검증: 상태 코드, 응답 시간, 콘텐츠 존재 여부 확인
        const success = check(response, {
            [`${selectedEndpoint.name} - Status is 200`]: r => r.status === 200,
            [`${selectedEndpoint.name} - Response time < 2000ms`]: r => r.timings.duration < 2000,
            [`${selectedEndpoint.name} - Content exists`]: r => r.body.length > 0,
        });
        
        // 성공/실패에 따른 메트릭 업데이트
        if (success) {
            successRate.add(1);  // 성공률 메트릭에 성공 카운트 추가
        } else {
            successRate.add(0);  // 성공률 메트릭에 실패 카운트 추가
            errorCounter.add(1); // 에러 카운터 증가
        }
        
        // 0.5초에서 2.5초 사이의 랜덤 대기 시간 (실제 사용자 행동 시뮬레이션)
        sleep(Math.random() * 2 + 0.5);
    });
}
