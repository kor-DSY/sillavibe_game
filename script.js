document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 (이전과 동일)
    const scoreElement = document.getElementById('score');
    const gapLabelElement = document.querySelector('.gap-label');
    const gapScoreElement = document.querySelector('.gap-score');
    const rankingList = document.getElementById('ranking-list');
    const resetTimerElement = document.getElementById('reset-timer');
    const gameBoard = document.getElementById('game-board');
    const timerElement = document.getElementById('timer');
    const comboElement = document.getElementById('combo');
    const comboGaugeContainer = document.getElementById('combo-gauge-container');
    const comboGauge = document.getElementById('combo-gauge');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const finalScoreElement = document.getElementById('final-score');
    const playerNameInput = document.getElementById('player-name');
    const saveScoreButton = document.getElementById('save-score-button');
    const dontSaveButton = document.getElementById('dont-save-button');
    const restartButton = document.getElementById('restart-button');
    const startGameOverlay = document.getElementById('start-game-overlay');
    const startGameButton = document.getElementById('start-game-button');

    // 게임 설정 및 상태 변수들 (이전과 동일)
    const boardSize = 8, initialTime = 60, maxCombo = 10, comboTimeout = 5000, MAX_LEADERBOARD_ENTRIES = 10;
    const gemImages = ['img/j1.png', 'img/j2.png', 'img/j3.png', 'img/j4.png'];
    let board = [], score = 0, timeLeft = initialTime, selectedGem = null, timerId, combo = 0, comboTimerId = null, isGameActive = false;

    // --- 랭킹 및 초기화 시스템 (이전과 동일) --- //
    function checkAndHandleReset() {
        const now = new Date();
        const currentHour = now.getHours();
        const lastResetHour = localStorage.getItem('lastResetHour');
        if (lastResetHour === null || parseInt(lastResetHour) !== currentHour) {
            localStorage.removeItem('gemGameLeaderboard');
            localStorage.setItem('lastResetHour', currentHour);
            updateLeaderboardDisplay();
        }
    }

    function updateResetCountdown() {
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1, 0, 0, 0);
        const diff = nextHour - now;
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        resetTimerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        if (minutes === 59 && seconds === 59) {
            checkAndHandleReset();
        }
    }

    function loadLeaderboard() {
        const leaderboardJSON = localStorage.getItem('gemGameLeaderboard');
        return leaderboardJSON ? JSON.parse(leaderboardJSON) : [];
    }

    function saveLeaderboard(leaderboard) {
        localStorage.setItem('gemGameLeaderboard', JSON.stringify(leaderboard));
    }

    function updateLeaderboardDisplay() {
        const leaderboard = loadLeaderboard();
        rankingList.innerHTML = '';
        leaderboard.forEach((entry, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${index + 1}. ${entry.name}</span><span>${entry.score}</span>`;
            rankingList.appendChild(li);
        });
        updateGapToFirst();
    }

    function updateGapToFirst() {
        const leaderboard = loadLeaderboard();
        gapLabelElement.classList.remove('hidden');
        if (leaderboard.length > 0) {
            const topScore = leaderboard[0].score;
            const gap = topScore - score;
            if (gap > 0) {
                gapLabelElement.textContent = '1위까지';
                gapScoreElement.textContent = `${gap.toLocaleString()}점`;
            } else {
                gapLabelElement.textContent = '현재';
                gapScoreElement.textContent = '🎉 1위 달성!';
            }
        } else {
            gapLabelElement.textContent = '랭킹에 도전하세요!';
            gapScoreElement.textContent = '첫 득점자!';
        }
    }

    function showRestartButton() {
        playerNameInput.classList.add('hidden');
        saveScoreButton.classList.add('hidden');
        dontSaveButton.classList.add('hidden');
        restartButton.classList.remove('hidden');
    }

    function handleSaveScore() {
        const playerName = playerNameInput.value.trim();
        if (!playerName) { alert('이름을 입력해주세요!'); return; }
        const leaderboard = loadLeaderboard();
        leaderboard.push({ name: playerName, score: score });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard.splice(MAX_LEADERBOARD_ENTRIES);
        saveLeaderboard(leaderboard);
        updateLeaderboardDisplay();
        showRestartButton();
    }

    // --- 게임 로직 (폭탄 기능 추가) --- //
    function startGame() {
        score = 0;
        timeLeft = initialTime;
        combo = 0;
        selectedGem = null;
        isGameActive = true;

        clearInterval(timerId);
        clearTimeout(comboTimerId);

        scoreElement.textContent = score;
        timerElement.textContent = timeLeft;
        comboElement.textContent = combo;
        updateGapToFirst();
        
        gameOverOverlay.classList.add('hidden');
        playerNameInput.classList.remove('hidden');
        playerNameInput.value = '';
        saveScoreButton.classList.remove('hidden');
        dontSaveButton.classList.remove('hidden');
        restartButton.classList.add('hidden');

        comboGaugeContainer.classList.add('hidden');
        comboGauge.classList.remove('running');
        
        gameBoard.innerHTML = '';
        board = [];

        createBoard();
        checkForInitialMatches();
        timerId = setInterval(updateTimer, 1000);
    }

    function createBoard() {
        for (let i = 0; i < boardSize * boardSize; i++) {
            const gem = document.createElement('div');
            gem.classList.add('gem');
            const imageIndex = Math.floor(Math.random() * gemImages.length);
            gem.style.backgroundImage = `url('${gemImages[imageIndex]}')`;
            gem.dataset.image = gemImages[imageIndex];
            gem.dataset.id = i;
            gem.dataset.isBomb = 'false'; // 폭탄 속성 추가
            gem.addEventListener('click', onGemClick);
            gameBoard.appendChild(gem);
            board.push(gem);
        }
    }

    function updateTimer() {
        timeLeft--;
        timerElement.textContent = timeLeft;
        if (timeLeft <= 0) endGame();
    }

    function endGame() {
        isGameActive = false;
        clearInterval(timerId);
        clearTimeout(comboTimerId);
        finalScoreElement.textContent = score;
        gameOverOverlay.classList.remove('hidden');
        board.forEach(gem => gem.style.pointerEvents = 'none');
    }

    function onGemClick(e) {
        if (!isGameActive) return;
        const clickedGem = e.target;

        // 폭탄 클릭 처리
        if (clickedGem.dataset.isBomb === 'true') {
            detonateBomb(clickedGem);
            return;
        }

        if (!selectedGem) {
            selectedGem = clickedGem;
            selectedGem.classList.add('selected');
        } else {
            const firstGemId = parseInt(selectedGem.dataset.id), secondGemId = parseInt(clickedGem.dataset.id);
            if (firstGemId === secondGemId) {
                selectedGem.classList.remove('selected');
                selectedGem = null;
                return;
            }

            // 폭탄과는 위치를 바꿀 수 없음
            if (board[secondGemId].dataset.isBomb === 'true') {
                selectedGem.classList.remove('selected');
                selectedGem = null;
                return;
            }

            const isAdjacent = Math.abs(firstGemId - secondGemId) === 1 || Math.abs(firstGemId - secondGemId) === boardSize;
            if (isAdjacent) {
                swapGems(selectedGem, clickedGem);
                board.forEach(gem => gem.style.pointerEvents = 'none');
                setTimeout(() => {
                    if (!checkForMatches()) swapGems(clickedGem, selectedGem);
                    selectedGem.classList.remove('selected');
                    selectedGem = null;
                    if (isGameActive) board.forEach(gem => gem.style.pointerEvents = 'auto');
                }, 300);
            } else {
                selectedGem.classList.remove('selected');
                selectedGem = clickedGem;
                selectedGem.classList.add('selected');
            }
        }
    }

    function detonateBomb(bombGem) {
        const bombId = parseInt(bombGem.dataset.id);
        const row = Math.floor(bombId / boardSize);
        const col = bombId % boardSize;
        const gemsToRemove = new Set();

        // 가로, 세로줄 보석 추가
        for (let i = 0; i < boardSize; i++) {
            gemsToRemove.add(board[i * boardSize + col]); // 세로
            gemsToRemove.add(board[row * boardSize + i]); // 가로
        }

        processMatches(gemsToRemove, false);
    }

    function swapGems(gem1, gem2) {
        // 폭탄 상태도 함께 스왑
        const isBomb1 = gem1.dataset.isBomb === 'true';
        const isBomb2 = gem2.dataset.isBomb === 'true';

        if (isBomb1) {
            gem2.classList.add('bomb');
            gem2.dataset.isBomb = 'true';
            gem2.style.backgroundImage = '';
        } else {
            gem2.classList.remove('bomb');
            gem2.dataset.isBomb = 'false';
            gem2.style.backgroundImage = gem1.style.backgroundImage;
            gem2.dataset.image = gem1.dataset.image;
        }

        if (isBomb2) {
            gem1.classList.add('bomb');
            gem1.dataset.isBomb = 'true';
            gem1.style.backgroundImage = '';
        } else {
            gem1.classList.remove('bomb');
            gem1.dataset.isBomb = 'false';
            gem1.style.backgroundImage = gem2.style.backgroundImage;
            gem1.dataset.image = gem1.dataset.image;
        }

        // 원래 이미지 정보 스왑 (폭탄이 아닐 경우를 위해)
        const tempImage = gem1.dataset.image;
        gem1.dataset.image = gem2.dataset.image;
        gem2.dataset.image = tempImage;
    }

    function checkForInitialMatches() {
        let hasMatch = true;
        while (hasMatch) {
            hasMatch = false;
            if (checkForMatches(true)) {
                hasMatch = true;
                fillBoard();
            }
        }
    }

    function resetCombo() {
        combo = 0;
        comboElement.textContent = combo;
        comboGaugeContainer.classList.add('hidden');
        comboGauge.classList.remove('running');
    }

    function findMatches() {
        const matches = { threes: [], fours: [], fives: [] };
        const processed = new Set(); // 중복 처리를 막기 위한 Set

        // 가로/세로 동시 확인
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                const horzKey = `h-${i}-${j}`;
                const vertKey = `v-${i}-${j}`;

                // 가로 매치 확인
                if (j < boardSize - 2 && !processed.has(horzKey)) {
                    let hMatch = [board[i*boardSize+j], board[i*boardSize+j+1], board[i*boardSize+j+2]];
                    if (hMatch.every(gem => gem && gem.dataset.image === hMatch[0].dataset.image && gem.dataset.isBomb === 'false')) {
                        let k = 3;
                        while (j + k < boardSize) {
                            const nextGem = board[i*boardSize+j+k];
                            if (nextGem && nextGem.dataset.image === hMatch[0].dataset.image && nextGem.dataset.isBomb === 'false') {
                                hMatch.push(nextGem);
                                k++;
                            } else break;
                        }
                        if (hMatch.length >= 3) {
                            const key = hMatch.length === 5 ? 'fives' : hMatch.length === 4 ? 'fours' : 'threes';
                            matches[key].push(hMatch);
                            hMatch.forEach((gem, idx) => processed.add(`h-${i}-${j+idx}`));
                        }
                    }
                }

                // 세로 매치 확인
                if (i < boardSize - 2 && !processed.has(vertKey)) {
                    let vMatch = [board[i*boardSize+j], board[(i+1)*boardSize+j], board[(i+2)*boardSize+j]];
                    if (vMatch.every(gem => gem && gem.dataset.image === vMatch[0].dataset.image && gem.dataset.isBomb === 'false')) {
                        let k = 3;
                        while (i + k < boardSize) {
                            const nextGem = board[(i+k)*boardSize+j];
                            if (nextGem && nextGem.dataset.image === vMatch[0].dataset.image && nextGem.dataset.isBomb === 'false') {
                                vMatch.push(nextGem);
                                k++;
                            } else break;
                        }
                        if (vMatch.length >= 3) {
                            const key = vMatch.length === 5 ? 'fives' : vMatch.length === 4 ? 'fours' : 'threes';
                            matches[key].push(vMatch);
                            vMatch.forEach((gem, idx) => processed.add(`v-${i+idx}-${j}`));
                        }
                    }
                }
            }
        }
        return matches;
    }

    function checkForMatches(isInitial = false) {
        const matches = findMatches();
        const gemsToRemove = new Set();
        const bombsToCreate = [];

        // 5개 매치 처리
        matches.fives.forEach(match => {
            match.forEach(gem => gemsToRemove.add(gem));
            bombsToCreate.push(match[2]); // 가운데 보석 위치에 폭탄 생성
        });

        // 4개 매치 처리
        matches.fours.forEach(match => {
            const isHorizontal = parseInt(match[1].dataset.id) - parseInt(match[0].dataset.id) === 1;
            if (isHorizontal) {
                const row = Math.floor(parseInt(match[0].dataset.id) / boardSize);
                for (let k = 0; k < boardSize; k++) gemsToRemove.add(board[row * boardSize + k]);
            } else {
                const col = parseInt(match[0].dataset.id) % boardSize;
                for (let k = 0; k < boardSize; k++) gemsToRemove.add(board[k * boardSize + col]);
            }
        });

        // 3개 매치 처리
        matches.threes.forEach(match => {
            match.forEach(gem => gemsToRemove.add(gem));
        });

        if (gemsToRemove.size > 0) {
            // 폭탄이 생성될 위치의 보석은 제거 목록에서 제외
            bombsToCreate.forEach(bombGem => gemsToRemove.delete(bombGem));
            processMatches(gemsToRemove, isInitial);
            // 폭탄 생성
            bombsToCreate.forEach(gem => {
                gem.classList.add('bomb');
                gem.dataset.isBomb = 'true';
                gem.dataset.image = 'bomb'; // 이미지 데이터 변경
                gem.style.backgroundImage = '';
            });
            return true;
        }
        return false;
    }

    function processMatches(gemsToRemove, isInitial) {
        if (gemsToRemove.size === 0) return;

        if (!isInitial) {
            clearTimeout(comboTimerId);
            combo = Math.min(combo + 1, maxCombo);
            const comboBonus = combo * 10;
            score += (gemsToRemove.size * 10) + comboBonus;
            scoreElement.textContent = score;
            comboElement.textContent = combo;
            updateGapToFirst();

            comboGaugeContainer.classList.remove('hidden');
            comboGauge.classList.remove('running');
            void comboGauge.offsetWidth; // Reflow
            comboGauge.classList.add('running');
            comboTimerId = setTimeout(resetCombo, comboTimeout);
        }
        
        // 수정된 부분: 모든 보석(폭탄 포함)을 깨끗하게 초기화
        gemsToRemove.forEach(gem => {
            gem.classList.remove('bomb');
            gem.dataset.isBomb = 'false';
            gem.style.backgroundImage = 'none';
            gem.dataset.image = '';
        });

        setTimeout(shiftAndFill, 300);
    }

    function shiftAndFill() {
        shiftGemsDown();
        fillBoard();
        if (isGameActive) checkForMatches();
    }

    function shiftGemsDown() {
        for (let j = 0; j < boardSize; j++) {
            let emptyRow = -1;
            for (let i = boardSize - 1; i >= 0; i--) {
                const index = i * boardSize + j;
                if (board[index].style.backgroundImage === 'none' && board[index].dataset.isBomb === 'false') {
                    if(emptyRow === -1) emptyRow = i;
                }
                if ((board[index].style.backgroundImage !== 'none' || board[index].dataset.isBomb === 'true') && emptyRow !== -1) {
                    swapGems(board[index], board[emptyRow * boardSize + j]);
                    emptyRow--;
                }
            }
        }
    }

    function fillBoard() {
        for (let i = 0; i < boardSize * boardSize; i++) {
            if (board[i].style.backgroundImage === 'none' && board[i].dataset.isBomb === 'false') {
                const imageIndex = Math.floor(Math.random() * gemImages.length);
                board[i].style.backgroundImage = `url('${gemImages[imageIndex]}')`;
                board[i].dataset.image = gemImages[imageIndex];
            }
        }
    }

    // 이벤트 리스너
    restartButton.addEventListener('click', startGame);
    saveScoreButton.addEventListener('click', handleSaveScore);
    dontSaveButton.addEventListener('click', showRestartButton);
    startGameButton.addEventListener('click', () => {
        startGameOverlay.classList.add('hidden');
        startGame();
    });

    // --- 초기화 실행 --- //
    checkAndHandleReset();
    updateLeaderboardDisplay();
    setInterval(updateResetCountdown, 1000);
});