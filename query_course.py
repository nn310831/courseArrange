import requests
from bs4 import BeautifulSoup
import re

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
    # 因為 HTML 中的 <td> 沒有關閉，所以需要手動解析
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
        # td_matches[8] 到 td_matches[14] 是星期日到星期六
        for i in range(7):
            if len(td_matches) > 8 + i:
                time_text = clean_html(td_matches[8 + i])
                
                # 過濾空白字符
                if time_text and time_text not in ['', '　', '\u3000']:
                    # 匹配節次（1-9 或 A-D，可能是單個或多個空格分隔）
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


def query_course(cname=""):
    """
    查詢台北科技大學課程
    
    Args:
        cname: 課程名稱
    
    Returns:
        Response object
    """
    url = "https://aps.ntut.edu.tw/course/tw/QueryCourse.jsp"
    
    # 準備 form data
    form_data = {
        'stime': '0',
        'year': '114',
        'matric': "'1','5','6','7','8','9'",
        'sem': '2',
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
    
    return response


if __name__ == "__main__":
    # 執行查詢
    response = query_course(cname="區塊鏈應用設計")
    
    # 顯示結果
    print(f"狀態碼: {response.status_code}")
    print(f"回應長度: {len(response.text)} 字元")
    
    # 儲存結果到檔案
    with open("course_result.html", "w", encoding="utf-8") as f:
        f.write(response.text)
    
    print("結果已儲存到 course_result.html")
    
    # 解析並顯示課程時間
    print("\n=== 課程時間資訊 ===")
    courses = parse_course_time(response.text)
    
    print(f"找到 {len(courses)} 門課程")
    
    if len(courses) == 0:
        print("警告：沒有解析到任何課程，檢查 HTML 結構...")
        # 調試：顯示表格結構
        soup = BeautifulSoup(response.text, 'html.parser')
        table = soup.find('table', {'border': '1'})
        if table:
            rows = table.find_all('tr')
            print(f"表格共有 {len(rows)} 行")
            if len(rows) > 1:
                cols = rows[1].find_all(['td', 'TD'], recursive=False)
                print(f"第二行有 {len(cols)} 個欄位")
    
    for course in courses:
        print(f"\n課號: {course['課號']}")
        print(f"課程名稱: {course['課程名稱']}")
        print(f"教師: {course['教師']}")
        print(f"班級: {course['班級']}")
        print(f"教室: {course.get('教室', 'N/A')}")
        print("上課時間:")
        if course['時間']:
            for time in course['時間']:
                print(f"  星期{time['星期']} 第{time['節次']}節")
        else:
            print("  無固定時間")
        print("-" * 50)
