// 課程表數據存儲
let timetableData = [];

// 節次定義
const periods = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C'];
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

// 初始化課程表
function initTimetable() {
    const tbody = document.getElementById('timetable-body');
    tbody.innerHTML = '';
    
    periods.forEach(period => {
        const row = document.createElement('tr');
        
        // 節次欄位
        const periodCell = document.createElement('td');
        periodCell.textContent = period;
        periodCell.style.fontWeight = 'bold';
        row.appendChild(periodCell);
        
        // 星期欄位
        weekdays.forEach(day => {
            const cell = document.createElement('td');
            cell.dataset.day = day;
            cell.dataset.period = period;
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
    
    renderTimetable();
}

// 計算總學分
function calculateTotalCredits() {
    let total = 0;
    timetableData.forEach(course => {
        const credits = parseFloat(course.學分) || 0;
        total += credits;
    });
    return total;
}

// 更新學分顯示
function updateCreditsDisplay() {
    const totalCredits = calculateTotalCredits();
    const creditsElement = document.getElementById('totalCredits');
    
    if (creditsElement) {
        // 添加數字變化動畫
        creditsElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            creditsElement.textContent = totalCredits.toFixed(1);
            creditsElement.style.transform = 'scale(1)';
        }, 150);
    }
}

// 渲染課程表
function renderTimetable() {
    // 清空所有格子
    document.querySelectorAll('.timetable td[data-day]').forEach(cell => {
        cell.innerHTML = '';
    });
    
    // 填充課程
    timetableData.forEach((course, index) => {
        course.時間.forEach(time => {
            const cell = document.querySelector(
                `td[data-day="${time.星期}"][data-period="${time.節次}"]`
            );
            
            if (cell && !cell.hasChildNodes()) {
                const block = document.createElement('div');
                // 根據是否為暫定課程添加不同的 class
                block.className = course.isTentative ? 'course-block tentative-course' : 'course-block';
                
                if (course.isTentative) {
                    // 暫定課程顯示
                    block.innerHTML = `
                        <button class="delete-btn" onclick="deleteCourse(${index})">×</button>
                        <div class="tentative-badge">暫定</div>
                        <div class="course-name">${course.課程名稱}</div>
                        <div class="course-teacher">${course.學分 || '0.0'} 學分</div>
                    `;
                } else {
                    // 正式課程顯示
                    block.innerHTML = `
                        <button class="delete-btn" onclick="deleteCourse(${index})">×</button>
                        <div class="course-name">${course.課程名稱}</div>
                        <div class="course-teacher">${course.教師}</div>
                        <div class="course-classroom">${course.教室}</div>
                    `;
                }
                cell.appendChild(block);
            }
        });
    });
    
    // 在空白格子添加 "+" 圖標
    document.querySelectorAll('.timetable td[data-day]').forEach(cell => {
        if (!cell.hasChildNodes()) {
            const addBtn = document.createElement('button');
            addBtn.className = 'add-tentative-btn';
            addBtn.innerHTML = '<i class="fas fa-plus"></i>';
            addBtn.onclick = () => showTentativeModal(cell.dataset.day, cell.dataset.period);
            cell.appendChild(addBtn);
        }
    });
    
    // 更新學分顯示
    updateCreditsDisplay();
}

// 搜尋課程
async function searchCourse() {
    const year = document.getElementById('year').value;
    const semester = document.getElementById('semester').value;
    const courseName = document.getElementById('courseName').value;
    
    if (!courseName.trim()) {
        alert('請輸入課程名稱');
        return;
    }
    
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div class="loading">查詢中...</div>';
    
    try {
        const response = await fetch('/api/search_course', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                year: year,
                semester: semester,
                courseName: courseName
            })
        });
        
        const courses = await response.json();
        
        if (courses.length === 0) {
            resultsDiv.innerHTML = '<p style="text-align:center;color:#999;">查無課程</p>';
            return;
        }
        
        resultsDiv.innerHTML = '';
        courses.forEach(course => {
            const courseDiv = document.createElement('div');
            courseDiv.className = 'course-item';
            
            const timeStr = course.時間.map(t => `星期${t.星期} 第${t.節次}節`).join(', ');
            
            courseDiv.innerHTML = `
                <h4>${course.課程名稱}</h4>
                <p><strong>課號:</strong> ${course.課號}</p>
                <p><strong>教師:</strong> ${course.教師}</p>
                <p><strong>班級:</strong> ${course.班級}</p>
                <p><strong>教室:</strong> ${course.教室}</p>
                <p><strong>時間:</strong> ${timeStr}</p>
                <button onclick='addCourse(${JSON.stringify(course).replace(/'/g, "&apos;")})'>加入課程表</button>
            `;
            
            resultsDiv.appendChild(courseDiv);
        });
    } catch (error) {
        console.error('Error:', error);
        resultsDiv.innerHTML = '<p style="color:red;">查詢失敗，請稍後再試</p>';
    }
}

// 檢查時間衝突
function checkConflict(newCourse) {
    const conflicts = [];
    
    newCourse.時間.forEach(newTime => {
        timetableData.forEach(existingCourse => {
            existingCourse.時間.forEach(existingTime => {
                if (existingTime.星期 === newTime.星期 && 
                    existingTime.節次 === newTime.節次) {
                    conflicts.push({
                        course: existingCourse.課程名稱,
                        time: `星期${existingTime.星期} 第${existingTime.節次}節`
                    });
                }
            });
        });
    });
    
    return conflicts;
}

// 顯示衝突彈窗
function showConflictModal(conflicts) {
    const modal = document.getElementById('conflictModal');
    const message = document.getElementById('conflictMessage');
    
    const conflictList = conflicts.map(c => 
        `<strong>${c.course}</strong> (${c.time})`
    ).join('<br>');
    
    message.innerHTML = `以下課程時間衝突：<br><br>${conflictList}`;
    modal.style.display = 'block';
}

// 新增課程
function addCourse(course) {
    // 檢查衝突
    const conflicts = checkConflict(course);
    
    if (conflicts.length > 0) {
        showConflictModal(conflicts);
        return;
    }
    
    // 無衝突，加入課程表
    timetableData.push(course);
    renderTimetable();
    saveTimetable();
    
    alert('課程已成功加入');
    
    // 移動端自動關閉側邊欄
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

// 刪除課程
function deleteCourse(index) {
    if (confirm('確定要刪除此課程嗎？')) {
        timetableData.splice(index, 1);
        renderTimetable();
        saveTimetable();
    }
}

// 儲存課程表到 localStorage
function saveTimetable() {
    localStorage.setItem('timetableData', JSON.stringify(timetableData));
}

// 載入課程表從 localStorage
function loadTimetable() {
    const saved = localStorage.getItem('timetableData');
    if (saved) {
        timetableData = JSON.parse(saved);
        renderTimetable();
    } else {
        // 如果沒有儲存的資料，也要更新學分顯示為 0
        updateCreditsDisplay();
    }
}

// 暫定課程相關變數
let tentativeDay = null;
let tentativePeriod = null;

// 顯示暫定課程彈窗
function showTentativeModal(day, period) {
    tentativeDay = day;
    tentativePeriod = period;
    
    const modal = document.getElementById('tentativeModal');
    const input = document.getElementById('tentativeCourseName');
    const creditsInput = document.getElementById('tentativeCredits');
    
    input.value = '';
    creditsInput.value = '';
    modal.style.display = 'block';
    
    // 自動聚焦到輸入框
    setTimeout(() => input.focus(), 100);
}

// 新增暫定課程
function addTentativeCourse() {
    const courseName = document.getElementById('tentativeCourseName').value.trim();
    const credits = document.getElementById('tentativeCredits').value || '0.0';
    
    if (!courseName) {
        alert('請輸入課程名稱');
        return;
    }
    
    // 創建暫定課程物件
    const tentativeCourse = {
        課號: 'TENTATIVE-' + Date.now(),
        課程名稱: courseName,
        階段: '1',
        學分: credits,
        時數: '0',
        修: '選',
        班級: '暫定',
        教師: '待定',
        教室: 'TBD',
        時間: [{
            星期: tentativeDay,
            節次: tentativePeriod
        }],
        isTentative: true
    };
    
    // 檢查衝突
    const conflicts = checkConflict(tentativeCourse);
    
    if (conflicts.length > 0) {
        showConflictModal(conflicts);
        return;
    }
    
    // 加入課程表
    timetableData.push(tentativeCourse);
    renderTimetable();
    saveTimetable();
    
    // 關閉彈窗
    document.getElementById('tentativeModal').style.display = 'none';
}

// 主題切換功能
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');
    
    body.classList.toggle('light-mode');
    
    if (body.classList.contains('light-mode')) {
        icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'light');
    } else {
        icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'dark');
    }
}

// 載入主題偏好
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle?.querySelector('i');
    
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        if (icon) icon.className = 'fas fa-sun';
    }
}

// 移動端側邊欄控制
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('active');
}

// 事件監聽
document.addEventListener('DOMContentLoaded', () => {
    initTimetable();
    loadTimetable();
    loadTheme();
    
    // 主題切換
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // 移動端浮動按鈕
    const mobileFab = document.getElementById('mobileFab');
    if (mobileFab) {
        mobileFab.addEventListener('click', toggleSidebar);
    }
    
    // 側邊欄關閉按鈕
    const sidebarClose = document.getElementById('sidebarClose');
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }
    
    document.getElementById('searchBtn').addEventListener('click', searchCourse);
    
    // 衝突彈窗關閉事件
    const modal = document.getElementById('conflictModal');
    const closeBtn = document.querySelector('.close');
    const closeModalBtn = document.getElementById('closeModal');
    
    closeBtn.onclick = () => modal.style.display = 'none';
    closeModalBtn.onclick = () => modal.style.display = 'none';
    
    // 暫定課程彈窗事件
    const tentativeModal = document.getElementById('tentativeModal');
    const closeTentative = document.getElementById('closeTentative');
    const cancelTentative = document.getElementById('cancelTentative');
    const confirmTentative = document.getElementById('confirmTentative');
    
    closeTentative.onclick = () => tentativeModal.style.display = 'none';
    cancelTentative.onclick = () => tentativeModal.style.display = 'none';
    confirmTentative.onclick = addTentativeCourse;
    
    // 彈窗外點擊關閉
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
        if (event.target === tentativeModal) {
            tentativeModal.style.display = 'none';
        }
    };
    
    // Enter 鍵搜尋
    document.getElementById('courseName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchCourse();
        }
    });
    
    // 暫定課程輸入框 Enter 鍵確認
    document.getElementById('tentativeCourseName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTentativeCourse();
        }
    });
    
    // 點擊遮罩層關閉側邊欄
    window.addEventListener('click', (event) => {
        const sidebar = document.getElementById('sidebar');
        const mobileFab = document.getElementById('mobileFab');
        
        if (sidebar.classList.contains('active') && 
            !sidebar.contains(event.target) && 
            event.target !== mobileFab) {
            closeSidebar();
        }
    });
});
