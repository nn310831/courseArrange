from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import re
import os

app = Flask(__name__, static_folder='.')
CORS(app)

def parse_course_time(html_content):
    """
    解析課程時間並暫存
    
    Args:
        html_content: HTML 回應內容
    
    Returns:
        list: 課程資訊列表，每個課程包含課號、課程名稱、教師、時間等資訊
    """
    courses = []
    
    # 星期對應
    weekdays = ['日', '一', '二', '三', '四', '五', '六']
    
    # 找到表格中的課程資料行（使用正則表達式）
    tr_pattern = r'<TR>(.*?)</TR>'
    tr_matches = re.findall(tr_pattern, html_content, re.DOTALL | re.IGNORECASE)
    
    for tr_content in tr_matches[1:]:  # 跳過表頭
        # 分割所有 td 標籤內容
        td_pattern = r'<[Tt][Dd][^>]*>(.*?)(?=<[Tt][Dd]|</TR>)'
        td_matches = re.findall(td_pattern, tr_content, re.DOTALL)
        
        if len(td_matches) < 15:
            continue
        
        # 提取純文字內容（去除 HTML 標籤）
        def clean_html(text):
            # 移除 HTML 標籤
            clean = re.sub(r'<[^>]+>', '', text)
            # 移除多餘空白
            clean = clean.strip()
            # 只取第一行
            clean = clean.split('\n')[0].strip()
            return clean
        
        course_info = {
            '課號': clean_html(td_matches[0]),
            '課程名稱': clean_html(td_matches[1]),
            '階段': clean_html(td_matches[2]),
            '學分': clean_html(td_matches[3]),
            '時數': clean_html(td_matches[4]),
            '修': clean_html(td_matches[5]),
            '班級': clean_html(td_matches[6]),
            '教師': clean_html(td_matches[7]),
            '時間': []
        }
        
        # 解析時間（日一二三四五六）
        for i in range(7):
            if len(td_matches) > 8 + i:
                time_text = clean_html(td_matches[8 + i])
                
                # 過濾空白字符
                if time_text and time_text not in ['', '　', '\u3000']:
                    # 匹配節次
                    periods = re.findall(r'[1-9A-D]', time_text)
                    for period in periods:
                        course_info['時間'].append({
                            '星期': weekdays[i],
                            '節次': period
                        })
        
        # 教室資訊
        if len(td_matches) > 15:
            course_info['教室'] = clean_html(td_matches[15])
        else:
            course_info['教室'] = 'N/A'
        
        courses.append(course_info)
    
    return courses


def query_course(year, sem, cname):
    """
    查詢台北科技大學課程
    
    Args:
        year: 學年度
        sem: 學期
        cname: 課程名稱
    
    Returns:
        list: 課程資訊列表
    """
    url = "https://aps.ntut.edu.tw/course/tw/QueryCourse.jsp"
    
    # 準備 form data
    form_data = {
        'stime': '0',
        'year': str(year),
        'matric': "'1','5','6','7','8','9'",
        'sem': str(sem),
        'unit': '＊',
        'cname': cname,
        'ccode': '',
        'tname': '',
        'D0': 'ON',
        'D1': 'ON',
        'D2': 'ON',
        'D3': 'ON',
        'D4': 'ON',
        'D5': 'ON',
        'D6': 'ON',
        'P1': 'ON',
        'P2': 'ON',
        'P3': 'ON',
        'P4': 'ON',
        'PN': 'ON',
        'P5': 'ON',
        'P6': 'ON',
        'P7': 'ON',
        'P8': 'ON',
        'P9': 'ON',
        'P10': 'ON',
        'P11': 'ON',
        'P12': 'ON',
        'P13': 'ON',
    }
    
    # 發送 POST 請求
    response = requests.post(url, data=form_data)
    
    if response.status_code == 200:
        return parse_course_time(response.text)
    else:
        return []


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)


@app.route('/api/search_course', methods=['POST'])
def search_course():
    data = request.json
    year = data.get('year', '114')
    semester = data.get('semester', '2')
    course_name = data.get('courseName', '')
    
    if not course_name:
        return jsonify([])
    
    courses = query_course(year, semester, course_name)
    return jsonify(courses)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"伺服器啟動中... 端口: {port}")
    app.run(host='0.0.0.0', debug=False, port=port)
