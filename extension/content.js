// BCD+ Dashboard Sync - Content Script

function extractData() {
  try {
    console.log("BCD+ Extension: extractData started...");
    
    // 1. 쿠팡이츠 파트너 대시보드에서 추출해야 할 최종 데이터 형태입니다.
    let result = {
      배정: 0,
      완료: 0,
      거절: 0,
      거절률: 0,
      수락전취소: 0,
      수락후취소: 0,
      근무인원: 0,
      피크타임: {
        아침: { 목표: 0, 완료: 0, 상태: '' },
        점심피크: { 목표: 0, 완료: 0, 상태: '' },
        점심논피크: { 목표: 0, 완료: 0, 상태: '' },
        저녁피크: { 목표: 0, 완료: 0, 상태: '' },
        저녁논피크: { 목표: 0, 완료: 0, 상태: '' }
      }
    };

    // 화면의 전체 텍스트를 가져와서 공백/줄바꿈을 최소화하여 단일 문자열로 압축합니다.
    const rawText = document.body.innerText;
    const text = rawText.replace(/\s+/g, ' ');

    // --- 상단 실시간 오늘의 실적 ---
    const assignMatch = text.match(/배정\s*물량\s*([\d\.]+)건/);
    if (assignMatch) result.배정 = parseFloat(assignMatch[1]);
    
    const completeMatch = text.match(/처리\s*물량\s*([\d\.]+)건/);
    if (completeMatch) result.완료 = parseFloat(completeMatch[1]);
    
    const rejectMatch = text.match(/총\s*거절\s*수\s*([\d\.\-]+)/);
    if (rejectMatch) {
      result.거절 = rejectMatch[1] === '-' ? 0 : parseFloat(rejectMatch[1]);
    }

    const rateMatch = text.match(/거절률\s*([\d\.\-]+)%/);
    if (rateMatch && rateMatch[1] !== '-') {
      result.거절률 = parseFloat(rateMatch[1]);
    }

    const preRejectMatch = text.match(/수락전\s*취소\s*([\d\.\-]+)건/);
    if (preRejectMatch && preRejectMatch[1] !== '-') {
      result.수락전취소 = parseFloat(preRejectMatch[1]);
    }

    const postRejectMatch = text.match(/수락후\s*취소\s*([\d\.\-]+)건/);
    if (postRejectMatch && postRejectMatch[1] !== '-') {
      result.수락후취소 = parseFloat(postRejectMatch[1]);
    }

    // --- 시간대별 기록 표에서 최신(마지막) 업무참여 인원 추출 ---
    // 가로 표 형태로 인해 "업무 참여 10 12 15 14 -" 처럼 이어집니다.
    const workingSequenceMatch = text.match(/업무\s*참여(?:\s+[\d\.\-]+)+/);
    if (workingSequenceMatch) {
      // '업무', '참여' 등 라벨을 제외하고 뒤에 따라오는 숫자/대시 토큰들을 배열로 만듭니다.
      const values = workingSequenceMatch[0].trim().split(/\s+/).filter(v => v !== '업무' && v !== '참여' && v !== '업무참여');
      // '-' 기호가 아닌 실제 유효한 숫자 중 가장 마지막(최근) 값을 가져옵니다.
      const validValues = values.filter(v => v !== '-' && !isNaN(parseFloat(v)));
      if (validValues.length > 0) {
        result.근무인원 = parseFloat(validValues[validValues.length - 1]);
      }
    }

    // --- 피크타임별 현황 ---
    // 피크타임별 현황 텍스트 이후부터 검색하여 상단 타이틀 등에 등장하는 단어와 혼동을 피합니다.
    const peakSectionIndex = text.indexOf("피크타임별 현황");
    const peaksText = peakSectionIndex !== -1 ? text.substring(peakSectionIndex) : text;

    function extractPeak(peakName, key) {
      // 해당 섹션 내에서만 매칭 (최대 150자 이내의 목표/완료 텍스트, 그리고 진행중 등 상태 유무)
      const regex = new RegExp(peakName + "(.{0,150}?)목표\\s*\\/?\\s*완료\\s*([\\d\\.]+)\\s*\\/\\s*([\\d\\.]+)");
      const match = peaksText.match(regex);
      if (match) {
        const midText = match[1];
        if (midText.includes("진행중")) result.피크타임[key].상태 = "진행중";
        else if (midText.includes("성공")) result.피크타임[key].상태 = "성공";
        else if (midText.includes("실패")) result.피크타임[key].상태 = "실패";
        else if (midText.includes("달성")) result.피크타임[key].상태 = "성공"; 

        // dashboard html might flip target/completed? Usually match[2] is target, match[3] is completed based on "18/5.8" logic from user (target 18, completed 5.8)
        // From user screenshot: "목표/완료 18/5.8" means match[2]=18, match[3]=5.8
        result.피크타임[key].목표 = parseFloat(match[2]);
        result.피크타임[key].완료 = parseFloat(match[3]);
      } else {
        console.log(`[BCD+] ${peakName} 데이터를 찾을 수 없습니다.`);
      }
    }

    extractPeak("아침", "아침");
    extractPeak("점심\\s*피크", "점심피크");
    extractPeak("점심\\s*논피크", "점심논피크");
    extractPeak("저녁\\s*피크", "저녁피크");
    extractPeak("저녁\\s*논피크", "저녁논피크");

    console.log("BCD+ Parsed Data: ", result);

    // 2. 추출한 데이터 백그라운드로 전송
    chrome.runtime.sendMessage({
      type: "SYNC_DATA",
      payload: result
    });
    
  } catch(e) {
    console.error("BCD+ Extension Error:", e);
  }
}

// 최초 실행 후 20초마다 주기적으로 데이터 추출 및 동기화
setTimeout(extractData, 3000);
setInterval(extractData, 20000);
