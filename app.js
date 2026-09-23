/**
 * 點名系統 (Attendance Management System) - 核心邏輯
 * 包含學生名單管理、點名互動區、即時統計圖表與 CSV 匯出功能
 */

// 預設範例名單 (首次造訪時載入)
const DEFAULT_STUDENTS = [
  { id: '101', name: '王大明', group: '第 1 組' },
  { id: '102', name: '李佳穎', group: '第 1 組' },
  { id: '103', name: '張書維', group: '第 1 組' },
  { id: '104', name: '陳怡萱', group: '第 2 組' },
  { id: '105', name: '林子軒', group: '第 2 組' },
  { id: '106', name: '黃俊傑', group: '第 2 組' },
  { id: '107', name: '劉語晴', group: '第 3 組' },
  { id: '108', name: '楊承翰', group: '第 3 組' },
  { id: '109', name: '趙敏君', group: '第 3 組' },
  { id: '110', name: '周柏宇', group: '第 4 組' },
  { id: '111', name: '吳美玲', group: '第 4 組' },
  { id: '112', name: '蔡睿哲', group: '第 4 組' },
  { id: '113', name: '許家豪', group: '第 5 組' },
  { id: '114', name: '鄭庭萱', group: '第 5 組' },
  { id: '115', name: '謝宗翰', group: '第 5 組' },
  { id: '116', name: '宋佩珊', group: '第 6 組' },
  { id: '117', name: '潘宥廷', group: '第 6 組' },
  { id: '118', name: '韓雅筑', group: '第 6 組' }
];

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 應用程式核心狀態
const AppState = {
  students: [],
  attendance: {}, // { [studentId]: 'present' | 'late' | 'absent' | 'unmarked' }
  courseName: '互動多媒體設計',
  currentDate: getLocalDateString(),
  currentTab: 'attendance', // 'attendance' | 'roster' | 'stats'
  viewMode: 'card', // 'card' | 'list'
  filterStatus: 'all', // 'all' | 'present' | 'late' | 'absent' | 'unmarked'
  searchQuery: '',
  editingStudentId: null,

  // 本機儲存讀取
  load() {
    try {
      const savedStudents = localStorage.getItem('ams_students');
      const savedAttendance = localStorage.getItem('ams_attendance');
      const savedCourse = localStorage.getItem('ams_course');
      const savedDate = localStorage.getItem('ams_date');
      const savedView = localStorage.getItem('ams_view');

      if (savedStudents) {
        this.students = JSON.parse(savedStudents);
      } else {
        this.students = [...DEFAULT_STUDENTS];
      }

      if (savedAttendance) {
        this.attendance = JSON.parse(savedAttendance);
      } else {
        this.resetAttendanceData();
      }

      if (savedCourse) this.courseName = savedCourse;
      if (savedDate) this.currentDate = savedDate;
      if (savedView) this.viewMode = savedView;
    } catch (e) {
      console.error('讀取 localStorage 失敗:', e);
      this.students = [...DEFAULT_STUDENTS];
      this.resetAttendanceData();
    }
  },

  // 本機儲存寫入
  save() {
    try {
      localStorage.setItem('ams_students', JSON.stringify(this.students));
      localStorage.setItem('ams_attendance', JSON.stringify(this.attendance));
      localStorage.setItem('ams_course', this.courseName);
      localStorage.setItem('ams_date', this.currentDate);
      localStorage.setItem('ams_view', this.viewMode);
    } catch (e) {
      console.error('儲存 localStorage 失敗:', e);
    }
  },

  resetAttendanceData() {
    this.attendance = {};
    this.students.forEach(s => {
      this.attendance[s.id] = 'unmarked';
    });
  }
};

// UI 與操作控制器
const UI = {
  // 初始化
  init() {
    AppState.load();

    // 綁定頂部資訊
    const courseInput = document.getElementById('courseNameInput');
    const dateInput = document.getElementById('attendanceDateInput');
    if (courseInput) {
      courseInput.value = AppState.courseName;
      courseInput.addEventListener('input', (e) => {
        AppState.courseName = e.target.value;
        AppState.save();
      });
    }
    if (dateInput) {
      dateInput.value = AppState.currentDate;
      dateInput.addEventListener('change', (e) => {
        AppState.currentDate = e.target.value;
        AppState.save();
        this.renderStats();
      });
    }

    // 綁定頁籤切換
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // 綁定搜尋輸入
    const searchInput = document.getElementById('studentSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        AppState.searchQuery = e.target.value.trim().toLowerCase();
        this.renderAttendanceList();
      });
    }

    // 綁定狀態篩選按鈕
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AppState.filterStatus = btn.dataset.filter;
        this.renderAttendanceList();
      });
    });

    // 檢視模式切換 (卡片 / 列表)
    document.getElementById('viewCardBtn')?.addEventListener('click', () => {
      AppState.viewMode = 'card';
      AppState.save();
      this.updateViewModeButtons();
      this.renderAttendanceList();
    });
    document.getElementById('viewListBtn')?.addEventListener('click', () => {
      AppState.viewMode = 'list';
      AppState.save();
      this.updateViewModeButtons();
      this.renderAttendanceList();
    });

    // 點名批次操作按鈕
    document.getElementById('markAllPresentBtn')?.addEventListener('click', () => {
      this.markAllPresent();
    });
    document.getElementById('resetAllAttendanceBtn')?.addEventListener('click', () => {
      if (confirm('確定要將所有學生的點名狀態重置為「未點名」嗎？')) {
        this.resetAllAttendance();
      }
    });

    // 點擊遮罩背景關閉 Modal
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
        }
      });
    });

    // 按下 ESC 鍵關閉所有開啟的 Modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(modal => {
          modal.classList.remove('open');
        });
      }
    });

    // 隨機抽籤點名
    document.getElementById('randomPickBtn')?.addEventListener('click', () => {
      this.openRandomPickerModal();
    });

    // 名單管理相關事件
    this.initRosterEvents();

    // 匯出報表與列印
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => this.exportToCSV());
    document.getElementById('printReportBtn')?.addEventListener('click', () => window.print());

    // 預設渲染
    this.updateViewModeButtons();
    this.render();
  },

  // 頁籤切換
  switchTab(tabName) {
    AppState.currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.style.display = (pane.id === `tab-${tabName}`) ? 'block' : 'none';
    });

    if (tabName === 'stats') {
      this.renderStats();
    } else if (tabName === 'attendance') {
      this.renderAttendanceList();
      this.updateOverviewKPI();
    } else if (tabName === 'roster') {
      this.renderRosterTable();
    }
  },

  updateViewModeButtons() {
    const isCard = AppState.viewMode === 'card';
    document.getElementById('viewCardBtn')?.classList.toggle('active', isCard);
    document.getElementById('viewListBtn')?.classList.toggle('active', !isCard);
  },

  // 全局渲染
  render() {
    this.updateOverviewKPI();
    this.renderAttendanceList();
    this.renderRosterTable();
    this.renderStats();
  },

  // 計算目前點名各狀態人數
  calculateCounts() {
    const total = AppState.students.length;
    let present = 0;
    let late = 0;
    let absent = 0;
    let unmarked = 0;

    AppState.students.forEach(s => {
      const status = AppState.attendance[s.id] || 'unmarked';
      if (status === 'present') present++;
      else if (status === 'late') late++;
      else if (status === 'absent') absent++;
      else unmarked++;
    });

    const presentRate = total > 0 ? Math.round((present / total) * 100) : 0;
    const lateRate = total > 0 ? Math.round((late / total) * 100) : 0;
    const absentRate = total > 0 ? Math.round((absent / total) * 100) : 0;

    return {
      total,
      present,
      late,
      absent,
      unmarked,
      presentRate,
      lateRate,
      absentRate
    };
  },

  // 更新頂部 KPI 指標與進度條
  updateOverviewKPI() {
    const { total, present, late, absent, presentRate, lateRate, absentRate } = this.calculateCounts();

    document.getElementById('kpiTotal').textContent = total;
    document.getElementById('kpiPresent').textContent = `${present} (${presentRate}%)`;
    document.getElementById('kpiLate').textContent = `${late} (${lateRate}%)`;
    document.getElementById('kpiAbsent').textContent = `${absent} (${absentRate}%)`;

    document.getElementById('progressText').textContent = `出席率：${presentRate}% (實到 ${present} / 應到 ${total})`;

    const barPresent = document.getElementById('progressBarPresent');
    const barLate = document.getElementById('progressBarLate');
    const barAbsent = document.getElementById('progressBarAbsent');

    if (barPresent && barLate && barAbsent) {
      barPresent.style.width = `${presentRate}%`;
      barLate.style.width = `${lateRate}%`;
      barAbsent.style.width = `${absentRate}%`;
    }
  },

  // 取得篩選與搜尋後的學生名單
  getFilteredStudents() {
    return AppState.students.filter(s => {
      // 搜尋條件
      const matchQuery = !AppState.searchQuery || 
        s.name.toLowerCase().includes(AppState.searchQuery) || 
        s.id.toLowerCase().includes(AppState.searchQuery) ||
        (s.group && s.group.toLowerCase().includes(AppState.searchQuery));

      if (!matchQuery) return false;

      // 狀態篩選
      const status = AppState.attendance[s.id] || 'unmarked';
      if (AppState.filterStatus === 'all') return true;
      return status === AppState.filterStatus;
    });
  },

  // 切換單一學生狀態 (點擊相同狀態可取消為未點名)
  setStudentStatus(studentId, newStatus) {
    if (AppState.attendance[studentId] === newStatus) {
      AppState.attendance[studentId] = 'unmarked';
    } else {
      AppState.attendance[studentId] = newStatus;
    }
    AppState.save();
    this.updateOverviewKPI();
    this.renderAttendanceList();
    if (AppState.currentTab === 'stats') {
      this.renderStats();
    }
  },

  // 一鍵全員出席
  markAllPresent() {
    AppState.students.forEach(s => {
      AppState.attendance[s.id] = 'present';
    });
    AppState.save();
    this.render();
    this.showToast('✅ 已將全體學生標記為「出席」');
  },

  // 一鍵重置為未點名
  resetAllAttendance() {
    AppState.resetAttendanceData();
    AppState.save();
    this.render();
    this.showToast('🔄 已重置所有學生狀態');
  },

  // 渲染點名互動區 (卡片與列表切換)
  renderAttendanceList() {
    const container = document.getElementById('attendanceContainer');
    if (!container) return;

    const filtered = this.getFilteredStudents();

    if (AppState.students.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>尚未建立學生名單</h3>
          <p>請切換至「學生名單管理」新增學生或載入範例名單</p>
          <button class="btn btn-primary" style="margin-top: 1rem;" onclick="UI.switchTab('roster')">前往名單管理</button>
        </div>
      `;
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>查無符合條件的學生</h3>
          <p>請檢查搜尋關鍵字或篩選標籤</p>
        </div>
      `;
      return;
    }

    if (AppState.viewMode === 'card') {
      // 卡片模式
      container.className = 'attendance-grid';
      container.innerHTML = filtered.map(student => {
        const status = AppState.attendance[student.id] || 'unmarked';
        const statusBadgeMap = {
          present: '<span class="current-status-badge badge-present">✓ 出席</span>',
          late: '<span class="current-status-badge badge-late">⏰ 遲到</span>',
          absent: '<span class="current-status-badge badge-absent">✕ 缺席</span>',
          unmarked: '<span class="current-status-badge badge-unmarked">未點名</span>'
        };

        const firstChar = student.name.charAt(0);

        return `
          <div class="student-card status-${status}" data-id="${student.id}">
            <div class="card-top">
              <div class="student-info">
                <div class="avatar-badge">${firstChar}</div>
                <div class="student-names">
                  <div class="student-name">${this.escapeHtml(student.name)}</div>
                  <div class="student-id">學號: ${this.escapeHtml(student.id)}</div>
                </div>
              </div>
              <div>
                ${statusBadgeMap[status]}
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="student-group-tag">${this.escapeHtml(student.group || '一般生')}</span>
            </div>

            <div class="status-buttons-group">
              <button 
                class="status-btn ${status === 'present' ? 'active-present' : ''}" 
                onclick="UI.setStudentStatus('${student.id}', 'present')"
                title="標記出席">
                出席
              </button>
              <button 
                class="status-btn ${status === 'late' ? 'active-late' : ''}" 
                onclick="UI.setStudentStatus('${student.id}', 'late')"
                title="標記遲到">
                遲到
              </button>
              <button 
                class="status-btn ${status === 'absent' ? 'active-absent' : ''}" 
                onclick="UI.setStudentStatus('${student.id}', 'absent')"
                title="標記缺席">
                缺席
              </button>
            </div>
          </div>
        `;
      }).join('');
    } else {
      // 列表模式
      container.className = '';
      container.innerHTML = `
        <table class="attendance-list-table">
          <thead>
            <tr>
              <th style="width: 120px;">學號</th>
              <th>姓名</th>
              <th style="width: 140px;">分組 / 備註</th>
              <th style="width: 120px;">目前狀態</th>
              <th style="width: 250px; text-align: center;">狀態切換</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(student => {
              const status = AppState.attendance[student.id] || 'unmarked';
              const statusBadgeMap = {
                present: '<span class="current-status-badge badge-present">✓ 出席</span>',
                late: '<span class="current-status-badge badge-late">⏰ 遲到</span>',
                absent: '<span class="current-status-badge badge-absent">✕ 缺席</span>',
                unmarked: '<span class="current-status-badge badge-unmarked">未點名</span>'
              };

              return `
                <tr class="status-${status}">
                  <td style="font-family: monospace; font-weight: 600;">${this.escapeHtml(student.id)}</td>
                  <td style="font-weight: 700; color: var(--gray-900); font-size: 1rem;">${this.escapeHtml(student.name)}</td>
                  <td><span class="student-group-tag">${this.escapeHtml(student.group || '-')}</span></td>
                  <td>${statusBadgeMap[status]}</td>
                  <td>
                    <div class="status-buttons-group">
                      <button 
                        class="status-btn ${status === 'present' ? 'active-present' : ''}" 
                        onclick="UI.setStudentStatus('${student.id}', 'present')">
                        出席
                      </button>
                      <button 
                        class="status-btn ${status === 'late' ? 'active-late' : ''}" 
                        onclick="UI.setStudentStatus('${student.id}', 'late')">
                        遲到
                      </button>
                      <button 
                        class="status-btn ${status === 'absent' ? 'active-absent' : ''}" 
                        onclick="UI.setStudentStatus('${student.id}', 'absent')">
                        缺席
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  },

  // 學生名單管理事件綁定
  initRosterEvents() {
    const studentForm = document.getElementById('studentAddForm');
    if (studentForm) {
      studentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('newStudentId').value.trim();
        const name = document.getElementById('newStudentName').value.trim();
        const group = document.getElementById('newStudentGroup').value.trim();

        if (!id || !name) {
          alert('學號與姓名皆為必填！');
          return;
        }

        // 檢查學號是否已存在
        const existing = AppState.students.find(s => s.id === id);
        if (existing) {
          alert(`學號 ${id} 已存在（學生：${existing.name}），請使用不同學號！`);
          return;
        }

        AppState.students.push({ id, name, group: group || '一般組' });
        AppState.attendance[id] = 'unmarked';
        AppState.save();

        studentForm.reset();
        this.render();
        this.showToast(`✨ 已新增學生：${name} (${id})`);
      });
    }

    // 批次匯入 Modal 開啟
    document.getElementById('openBatchImportBtn')?.addEventListener('click', () => {
      document.getElementById('batchImportModal').classList.add('open');
    });

    // 載入預設範例名單
    document.getElementById('loadSampleBtn')?.addEventListener('click', () => {
      if (confirm('確定要載入 18 筆示範學生名單嗎？這將會覆蓋當前名單。')) {
        AppState.students = JSON.parse(JSON.stringify(DEFAULT_STUDENTS));
        AppState.resetAttendanceData();
        AppState.save();
        this.render();
        this.showToast('📋 已成功載入範例名單');
      }
    });

    // 清空名單
    document.getElementById('clearAllStudentsBtn')?.addEventListener('click', () => {
      if (confirm('⚠️ 警告：確定要清空所有學生名單嗎？此操作無法復原！')) {
        AppState.students = [];
        AppState.attendance = {};
        AppState.save();
        this.render();
        this.showToast('🗑️ 名單已清空');
      }
    });

    // 批次匯入執行
    document.getElementById('submitBatchImportBtn')?.addEventListener('click', () => {
      const text = document.getElementById('batchImportTextarea').value.trim();
      if (!text) {
        alert('請輸入名單內容！');
        return;
      }

      const lines = text.split('\n');
      let count = 0;
      lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // 支援逗號、Tab、空格分隔格式
        let parts = line.split(/[,\t]+/);
        if (parts.length === 1) {
          parts = line.split(/\s+/);
        }

        if (parts.length >= 2) {
          const id = parts[0].trim();
          const name = parts[1].trim();
          const group = parts[2] ? parts[2].trim() : '一般組';

          if (id && name) {
            // 如果不存在則新增，如果存在則更新姓名組別
            const idx = AppState.students.findIndex(s => s.id === id);
            if (idx >= 0) {
              AppState.students[idx].name = name;
              AppState.students[idx].group = group;
            } else {
              AppState.students.push({ id, name, group });
              if (!AppState.attendance[id]) {
                AppState.attendance[id] = 'unmarked';
              }
            }
            count++;
          }
        }
      });

      AppState.save();
      this.closeModal('batchImportModal');
      document.getElementById('batchImportTextarea').value = '';
      this.render();
      this.showToast(`📥 成功匯入/更新 ${count} 筆學生資料`);
    });
  },

  // 渲染名單管理表格
  renderRosterTable() {
    const tbody = document.getElementById('rosterTableBody');
    const badge = document.getElementById('rosterTotalBadge');
    if (badge) badge.textContent = `${AppState.students.length} 人`;
    if (!tbody) return;

    if (AppState.students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--gray-400); padding: 2rem;">
            名單目前是空的，請使用左側表單新增或點擊上方「批次匯入 / 範例」
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = AppState.students.map((student, idx) => `
      <tr>
        <td style="font-family: monospace; font-weight: 600;">${this.escapeHtml(student.id)}</td>
        <td style="font-weight: 700;">${this.escapeHtml(student.name)}</td>
        <td><span class="student-group-tag">${this.escapeHtml(student.group || '-')}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="UI.openEditStudentModal('${student.id}')">編輯</button>
          <button class="btn btn-outline-danger btn-sm" onclick="UI.deleteStudent('${student.id}')">刪除</button>
        </td>
      </tr>
    `).join('');
  },

  // 刪除學生
  deleteStudent(studentId) {
    const student = AppState.students.find(s => s.id === studentId);
    if (!student) return;

    if (confirm(`確定要刪除學生「${student.name} (${student.id})」嗎？`)) {
      AppState.students = AppState.students.filter(s => s.id !== studentId);
      delete AppState.attendance[studentId];
      AppState.save();
      this.render();
      this.showToast(`🗑️ 已刪除學生 ${student.name}`);
    }
  },

  // 編輯學生 Modal
  openEditStudentModal(studentId) {
    const student = AppState.students.find(s => s.id === studentId);
    if (!student) return;

    AppState.editingStudentId = studentId;
    document.getElementById('editStudentId').value = student.id;
    document.getElementById('editStudentName').value = student.name;
    document.getElementById('editStudentGroup').value = student.group || '';
    document.getElementById('editStudentModal').classList.add('open');
  },

  saveEditStudent() {
    const id = AppState.editingStudentId;
    if (!id) return;

    const name = document.getElementById('editStudentName').value.trim();
    const group = document.getElementById('editStudentGroup').value.trim();

    if (!name) {
      alert('學生姓名不能為空！');
      return;
    }

    const student = AppState.students.find(s => s.id === id);
    if (student) {
      student.name = name;
      student.group = group;
      AppState.save();
      this.closeModal('editStudentModal');
      this.render();
      this.showToast(`✏️ 已更新學生資料`);
    }
  },

  // 渲染即時統計儀表板與圖表
  renderStats() {
    const counts = this.calculateCounts();

    // 更新統計指標卡
    document.getElementById('statTotalNum').textContent = counts.total;
    document.getElementById('statPresentNum').textContent = `${counts.present} 人`;
    document.getElementById('statPresentPct').textContent = `${counts.presentRate}%`;
    document.getElementById('statLateNum').textContent = `${counts.late} 人`;
    document.getElementById('statLatePct').textContent = `${counts.lateRate}%`;
    document.getElementById('statAbsentNum').textContent = `${counts.absent} 人`;
    document.getElementById('statAbsentPct').textContent = `${counts.absentRate}%`;
    document.getElementById('statUnmarkedNum').textContent = `${counts.unmarked} 人`;

    // 繪製 HTML5 Canvas Donut Chart
    this.drawDonutChart(counts);

    // 缺席名單與遲到名單速查
    const absentList = AppState.students.filter(s => AppState.attendance[s.id] === 'absent');
    const lateList = AppState.students.filter(s => AppState.attendance[s.id] === 'late');

    const absentContainer = document.getElementById('statsAbsentList');
    const lateContainer = document.getElementById('statsLateList');
    const absentCountBadge = document.getElementById('statsAbsentBadge');
    const lateCountBadge = document.getElementById('statsLateBadge');

    if (absentCountBadge) absentCountBadge.textContent = `${absentList.length} 人`;
    if (lateCountBadge) lateCountBadge.textContent = `${lateList.length} 人`;

    if (absentContainer) {
      if (absentList.length === 0) {
        absentContainer.innerHTML = '<li style="text-align: center; color: var(--gray-400); padding: 1rem;">無缺席學生 👍</li>';
      } else {
        absentContainer.innerHTML = absentList.map(s => `
          <li class="attention-list-item">
            <div>
              <strong>${this.escapeHtml(s.name)}</strong>
              <span style="font-size: 0.75rem; color: var(--gray-500); margin-left: 0.25rem;">(${this.escapeHtml(s.id)})</span>
            </div>
            <span class="student-group-tag">${this.escapeHtml(s.group || '一般組')}</span>
          </li>
        `).join('');
      }
    }

    if (lateContainer) {
      if (lateList.length === 0) {
        lateContainer.innerHTML = '<li style="text-align: center; color: var(--gray-400); padding: 1rem;">無遲到學生 👏</li>';
      } else {
        lateContainer.innerHTML = lateList.map(s => `
          <li class="attention-list-item">
            <div>
              <strong>${this.escapeHtml(s.name)}</strong>
              <span style="font-size: 0.75rem; color: var(--gray-500); margin-left: 0.25rem;">(${this.escapeHtml(s.id)})</span>
            </div>
            <span class="student-group-tag">${this.escapeHtml(s.group || '一般組')}</span>
          </li>
        `).join('');
      }
    }
  },

  // 繪製高解析度動態甜甜圈環形圖
  drawDonutChart(counts) {
    const canvas = document.getElementById('attendanceDonutChart');
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = 240;
    canvas.style.width = displaySize + 'px';
    canvas.style.height = displaySize + 'px';
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const width = displaySize;
    const height = displaySize;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = 90;
    const innerRadius = 60;

    // 清空重繪
    ctx.clearRect(0, 0, width, height);

    const total = counts.total;
    if (total === 0) {
      // 繪製灰色空環
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
      ctx.arc(centerX, centerY, innerRadius, 2 * Math.PI, 0, true);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
      document.getElementById('centerPresentRate').textContent = '0%';
      return;
    }

    const segments = [
      { count: counts.present, color: '#10b981' }, // 出席
      { count: counts.late, color: '#f59e0b' },    // 遲到
      { count: counts.absent, color: '#ef4444' },  // 缺席
      { count: counts.unmarked, color: '#cbd5e1' } // 未點名
    ];

    let currentAngle = -0.5 * Math.PI; // 從正上方 12 點鐘方向開始

    segments.forEach(seg => {
      if (seg.count === 0) return;
      const sliceAngle = (seg.count / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      currentAngle += sliceAngle;
    });

    // 更新中心出席率數字
    document.getElementById('centerPresentRate').textContent = `${counts.presentRate}%`;
  },

  // 隨機抽籤點名互動
  openRandomPickerModal() {
    if (AppState.students.length === 0) {
      alert('目前沒有學生名單可供抽取！');
      return;
    }

    const modal = document.getElementById('randomPickerModal');
    modal.classList.add('open');

    const nameEl = document.getElementById('pickerResultName');
    const idEl = document.getElementById('pickerResultId');
    const actionBtns = document.getElementById('pickerActionGroup');
    actionBtns.style.display = 'none';

    nameEl.textContent = '準備中...';
    idEl.textContent = '請點擊下方開始抽取';
  },

  startRollingAnimation() {
    const students = AppState.students;
    if (students.length === 0) return;

    const nameEl = document.getElementById('pickerResultName');
    const idEl = document.getElementById('pickerResultId');
    const startBtn = document.getElementById('startRollBtn');
    const actionBtns = document.getElementById('pickerActionGroup');
    actionBtns.style.display = 'none';
    startBtn.disabled = true;

    let iterations = 0;
    const maxIterations = 25;
    const intervalTime = 60;

    const timer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * students.length);
      const chosen = students[randomIndex];
      nameEl.textContent = chosen.name;
      idEl.textContent = `學號: ${chosen.id} | ${chosen.group || '一般組'}`;
      iterations++;

      if (iterations >= maxIterations) {
        clearInterval(timer);
        startBtn.disabled = false;
        startBtn.textContent = '🎲 再次抽取';
        actionBtns.style.display = 'flex';

        // 綁定當前抽到學生的即時點名按鈕
        this.currentPickedStudentId = chosen.id;
        this.updatePickerStatusButtons(chosen.id);
      }
    }, intervalTime);
  },

  updatePickerStatusButtons(studentId) {
    const status = AppState.attendance[studentId] || 'unmarked';
    document.querySelectorAll('.picker-status-btn').forEach(btn => {
      const btnStatus = btn.dataset.status;
      btn.classList.toggle('active-' + btnStatus, btnStatus === status);
    });
  },

  setPickedStudentStatus(status) {
    if (!this.currentPickedStudentId) return;
    this.setStudentStatus(this.currentPickedStudentId, status);
    this.updatePickerStatusButtons(this.currentPickedStudentId);
    this.showToast(`已為該生標記狀態：${status === 'present' ? '出席' : status === 'late' ? '遲到' : '缺席'}`);
  },

  // 匯出 CSV 報表
  exportToCSV() {
    if (AppState.students.length === 0) {
      alert('無學生資料可供匯出！');
      return;
    }

    const statusMap = {
      present: '出席',
      late: '遲到',
      absent: '缺席',
      unmarked: '未點名'
    };

    let csvContent = '\uFEFF'; // 加入 UTF-8 BOM，防止 Excel 開啟時繁體中文亂碼
    csvContent += `課程名稱,${AppState.courseName}\n`;
    csvContent += `點名日期,${AppState.currentDate}\n`;
    csvContent += `匯出時間,${new Date().toLocaleString()}\n\n`;
    csvContent += '序號,學號,學生姓名,組別/備註,點名狀態\n';

    AppState.students.forEach((student, index) => {
      const status = AppState.attendance[student.id] || 'unmarked';
      const statusText = statusMap[status] || '未點名';
      csvContent += `${index + 1},"${student.id}","${student.name}","${student.group || ''}","${statusText}"\n`;
    });

    const { total, present, late, absent, unmarked, presentRate } = this.calculateCounts();
    csvContent += `\n統計摘要\n`;
    csvContent += `總人數,${total}\n`;
    csvContent += `實到(出席),${present},出席率,${presentRate}%\n`;
    csvContent += `遲到,${late}\n`;
    csvContent += `缺席,${absent}\n`;
    csvContent += `未點名,${unmarked}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${AppState.courseName}_點名紀錄_${AppState.currentDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast('📥 點名表已成功匯出為 CSV 檔案');
  },

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('open');
  },

  showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

// 網頁載入完成時啟動
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
