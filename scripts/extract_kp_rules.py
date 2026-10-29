import zipfile
import xml.etree.ElementTree as ET
import re
import json

def parse_docx(filename):
    with zipfile.ZipFile(filename) as z:
        xml_content = z.read('word/document.xml')
        root = ET.fromstring(xml_content)

    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    tables = root.findall('.//w:tbl', ns)

    extracted_tables = []
    for t_idx, tbl in enumerate(tables):
        rows = tbl.findall('.//w:tr', ns)
        table_rows = []
        for r_idx, row in enumerate(rows):
            cells = row.findall('.//w:tc', ns)
            c_texts = [' '.join(''.join(tc.itertext()).split()) for tc in cells]
            table_rows.append((r_idx, c_texts))
        extracted_tables.append((t_idx, table_rows))
    return extracted_tables

def clean_text(s):
    if not s:
        return ''
    return ' '.join(str(s).split())

def extract_numbers(s):
    if not s:
        return []
    # Match house numbers 1-12
    found = re.findall(r'\b(1[0-2]|[1-9])\b', s)
    res = []
    for x in found:
        val = int(x)
        if val not in res:
            res.append(val)
    return res

def extract_parenthesized(s):
    if not s:
        return []
    parens = re.findall(r'\(([^)]+)\)', s)
    res = []
    for p in parens:
        res.extend(extract_numbers(p))
    return list(dict.fromkeys(res))

def extract_alternative_groups(s):
    if not s or (' or ' not in s.lower() and '/' not in s):
        return []
    # Split by 'or'
    parts = re.split(r'\bor\b', s, flags=re.IGNORECASE)
    groups = []
    for p in parts:
        nums = extract_numbers(p)
        if nums and nums not in groups:
            groups.append(nums)
    return groups if len(groups) > 1 else []

def extract_negative_houses(s, remark):
    combined = (s + ' ' + remark).lower()
    neg_houses = []
    # Look for "not connected to 5, 8, 12", "without 7", "excluding 9"
    patterns = [
        r'(?:not\s+connected\s+to|without|excluding|not\s+to\s+signify)\s+([0-9,\s&]+)',
        r'\*\s*without\s+([0-9,\s&]+)'
    ]
    for pat in patterns:
        m = re.findall(pat, combined)
        for match in m:
            nums = extract_numbers(match)
            for n in nums:
                if n not in neg_houses:
                    neg_houses.append(n)
    return neg_houses

def extract_planets(s, remark=''):
    combined = (s + ' ' + remark).lower()
    planets = []
    mapping = {
        'Sun': [r'\bsun\b', r'\bso\b', r'\bsurya\b'],
        'Moon': [r'\bmoon\b', r'\bmo\b', r'\bchandra\b'],
        'Mars': [r'\bmars\b', r'\bmar\b', r'\bma\b', r'\bkuja\b', r'\bmangal\b'],
        'Mercury': [r'\bmercury\b', r'\bmer\b', r'\bme\b', r'\bbudha\b'],
        'Jupiter': [r'\bjupiter\b', r'\bjup\b', r'\bju\b', r'\bguru\b'],
        'Venus': [r'\bvenus\b', r'\bven\b', r'\bve\b', r'\bshukra\b'],
        'Saturn': [r'\bsaturn\b', r'\bsat\b', r'\bsa\b', r'\bshani\b'],
        'Rahu': [r'\brahu\b', r'\brah\b', r'\bra\b'],
        'Ketu': [r'\bketu\b', r'\bket\b', r'\bke\b']
    }
    for p_name, patterns in mapping.items():
        for pat in patterns:
            if re.search(pat, combined):
                if p_name not in planets:
                    planets.append(p_name)
                break
    return planets

def extract_sublord_checks(s, remark=''):
    combined = s + ' ' + remark
    checks = []
    # e.g. "7th Sbl", "6th csl", "11th csl", "1st Sublord", "Sub lords of 3rd & 8th"
    matches = re.finditer(r'\b([1-9]|1[0-2])(?:st|nd|rd|th)?\s*(?:cusp\s+)?(?:sbl|csl|sub\s*lord|sublord)\b', combined, re.IGNORECASE)
    for m in matches:
        cusp_num = int(m.group(1))
        if cusp_num not in checks:
            checks.append(cusp_num)
    
    # Check "Sub lords of X & Y"
    multi_m = re.findall(r'sub\s*lords?\s+of\s+([0-9]+)(?:st|nd|rd|th)?\s*(?:&|and)\s*([0-9]+)(?:st|nd|rd|th)?', combined, re.IGNORECASE)
    for c1, c2 in multi_m:
        for c in [int(c1), int(c2)]:
            if c <= 12 and c not in checks:
                checks.append(c)
    return sorted(checks)

def extract_special_conditions(houses_str, dba_str, remark_str):
    conditions = []
    combined = f'{houses_str} {dba_str} {remark_str}'.lower()
    if 'bdk' in combined or 'badhaka' in combined:
        conditions.append('Badhaka involvement')
    if 'mrk' in combined or 'maraka' in combined:
        conditions.append('Maraka involvement')
    if 'mks' in combined or 'moksha' in combined:
        conditions.append('Moksha sthana involvement')
    if 'dual' in combined or 'duality' in combined:
        conditions.append('Dual sign connection (Gemini, Sagittarius, Pisces)')
    if 'movable' in combined:
        conditions.append('Movable sign connection')
    if 'fixed' in combined:
        conditions.append('Fixed sign connection')
    if 'fruitful' in combined:
        conditions.append('Fruitful sign connection (Cancer, Scorpio, Pisces)')
    if 'barren' in combined:
        conditions.append('Barren sign connection (Aries, Gemini, Leo, Virgo)')
    if 'earth' in combined:
        conditions.append('Earth sign connection')
    if 'rp' in combined or "rp's" in combined or 'ruling planet' in combined:
        conditions.append('Ruling Planets agreement required')
    if 'jointly' in combined:
        conditions.append('Houses/Significators must operate jointly in DBA')
    return conditions

def main():
    tables = parse_docx('KP HOUSE GROUPING.docx')
    print(f'Read {len(tables)} tables from KP HOUSE GROUPING.docx')

    all_rules = []
    category_catalog = []
    category_map = {}

    current_cusp = 1
    current_category = '1st Cusp (Lagna)'
    current_subject = 'LAGNA LORD'
    active_karakas = []

    # Map tables to estimated physical document page numbers (1-19)
    # 17 tables spanning 19 pages
    page_mapping = {
        0: 1,
        1: 2,
        2: 3,
        3: 4,
        4: 5,
        5: 6,
        6: 7,
        7: 8,
        8: 9,
        9: 10,
        10: 11,
        11: 12,
        12: 13,
        13: 14,
        14: 15,
        15: 16,
        16: 17
    }

    # Cusp display name map
    CUSP_NAMES = {
        1: '1st Cusp (Lagna / Self / Health / Longevity)',
        2: '2nd Cusp (Wealth / Family / Speech / Assets)',
        3: '3rd Cusp (Siblings / Courage / Travel / Contracts)',
        4: '4th Cusp (Education / Property / Vehicles / Mother)',
        5: '5th Cusp (Children / Speculation / Love / Creativity)',
        6: '6th Cusp (Job / Disease / Debt / Competition)',
        7: '7th Cusp (Marriage / Partnership / Business / Legal)',
        8: '8th Cusp (Longevity / Danger / Obstacles / Hidden Wealth)',
        9: '9th Cusp (Higher Studies / Father / Abroad / Pilgrimage / Research)',
        10: '10th Cusp (Career / Profession / Status / Honor)',
        11: '11th Cusp (Gains / Desires / Friends / Recovery / Elder Siblings)',
        12: '12th Cusp (Foreign / Loss / Hospitalization / Imprisonment / Moksha)'
    }

    rule_counter = 0

    for t_idx, rows in tables:
        page_num = page_mapping.get(t_idx, t_idx + 1)
        
        for r_idx, cells in rows:
            text_concat = ' '.join(cells)
            # Skip title / col headers
            if 'ROUPING TABLE' in text_concat or (len(cells) >= 3 and cells[1] == 'Sr. No.'):
                continue
            
            cusp_col = clean_text(cells[0]) if len(cells) > 0 else ''
            sr_no = clean_text(cells[1]) if len(cells) > 1 else ''
            subject_col = clean_text(cells[2]) if len(cells) > 2 else ''
            houses_col = clean_text(cells[3]) if len(cells) > 3 else ''
            dba_col = clean_text(cells[4]) if len(cells) > 4 else ''
            remark_col = clean_text(cells[5]) if len(cells) > 5 else ''

            # Update Cusp if explicitly provided and numeric
            if cusp_col:
                digits = re.findall(r'\b(1[0-2]|[1-9])\b', cusp_col)
                if digits:
                    current_cusp = int(digits[0])
                    current_category = CUSP_NAMES.get(current_cusp, f'Cusp {current_cusp}')

            # Check if this row is a Category / Subject Header
            # A row is a header if Sr. No. is empty and neither houses nor dba contains digits
            has_houses = any(c.isdigit() for c in houses_col) or any(c.isdigit() for c in dba_col)
            
            if sr_no == '' and not has_houses:
                if subject_col:
                    current_subject = subject_col
                    # Check if category header defines karakas
                    hdr_karakas = extract_planets(houses_col, remark_col)
                    active_karakas = hdr_karakas
                continue

            # Otherwise, this is a rule row!
            rule_counter += 1
            rule_id = f'kp.c{current_cusp}.t{t_idx}.r{r_idx}.{sr_no or rule_counter}'
            
            # Address specific OCR / typo wrapping identified in document analysis:
            # 1. T7R9 has event 'Reunion with' and T7R10 has 'partnerEarly death of partner'
            clean_event = subject_col
            review_flags = []
            
            if t_idx == 7 and r_idx == 9:
                clean_event = 'Reunion with partner'
                review_flags.append('ocr_typo_reunion_partner_joined')
            elif t_idx == 7 and r_idx == 10:
                clean_event = 'Early death of partner'
                review_flags.append('ocr_typo_partner_prefix_cleaned')
            elif t_idx == 5 and r_idx == 4 and not clean_event:
                clean_event = 'Gambling alternative / financial speculation'
                review_flags.append('unlabeled_sub_rule_following_gambling')
            elif t_idx == 7 and r_idx == 13 and not clean_event:
                clean_event = 'Second marriage (Rule 2: 2nd cusp sub-lord)'
                review_flags.append('unlabeled_sub_rule_second_marriage_rule_2')
            elif t_idx == 7 and r_idx == 14 and not clean_event:
                clean_event = 'Second marriage (Rule 3: by Mr. Kanak)'
                review_flags.append('unlabeled_sub_rule_second_marriage_rule_3')
            elif not clean_event:
                clean_event = f'{current_subject} (Item {sr_no or rule_counter})'
                review_flags.append('missing_event_title_assigned_default')

            # Extract numeric houses
            primary_numbers = extract_numbers(houses_col)
            dba_numbers = extract_numbers(dba_col)
            
            # If primary houses has no numbers, fallback to DBA numbers and flag review
            effective_houses = list(primary_numbers)
            if not effective_houses:
                if dba_numbers:
                    effective_houses = list(dba_numbers)
                    review_flags.append('houses_derived_from_joint_dba_column')
                else:
                    review_flags.append('no_direct_house_numbers_in_row')

            parenthesized_houses = list(dict.fromkeys(extract_parenthesized(houses_col) + extract_parenthesized(dba_col)))
            alt_groups = extract_alternative_groups(houses_col) or extract_alternative_groups(dba_col)
            neg_houses = extract_negative_houses(houses_col, remark_col)
            row_karakas = extract_planets(houses_col, remark_col)
            
            # Combined karakas (category + row-specific)
            all_karakas = list(dict.fromkeys(active_karakas + row_karakas))

            sublord_checks = extract_sublord_checks(houses_col, remark_col)
            special_conds = extract_special_conditions(houses_col, dba_col, remark_col)

            # Determine verification status
            verification_status = 'verified'
            if review_flags or 'no_direct_house_numbers_in_row' in review_flags:
                verification_status = 'needs-review'
            elif not effective_houses:
                verification_status = 'needs-review'
                review_flags.append('missing_house_grouping')

            rule_entry = {
                'id': rule_id,
                'cusp': current_cusp,
                'category': current_category,
                'subject': current_subject,
                'event': clean_event,
                'srNo': sr_no,
                'source': {
                    'document': 'KP HOUSE GROUPING.docx',
                    'page': page_num,
                    'tableIndex': t_idx,
                    'rowIndex': r_idx,
                    'tablePrefix': f'T{t_idx}R{r_idx}',
                    'srNo': sr_no
                },
                'housesToBeSignified': effective_houses,
                'jointDBA': {
                    'raw': dba_col,
                    'houses': dba_numbers,
                    'parenthesizedHouses': extract_parenthesized(dba_col)
                },
                'optionalHouses': parenthesized_houses,
                'alternativeGroups': alt_groups,
                'negativeHouses': neg_houses,
                'planetaryKarakas': all_karakas,
                'cuspSubLordChecks': sublord_checks,
                'specialConditions': special_conds,
                'remarks': remark_col,
                'originalNotation': {
                    'subjectMatter': subject_col,
                    'housesToBeSignified': houses_col,
                    'jointDBA': dba_col,
                    'remark': remark_col,
                    'cusp': cusp_col,
                    'srNo': sr_no
                },
                'verificationStatus': verification_status,
                'reviewFlags': review_flags
            }

            all_rules.append(rule_entry)

            # Register in category/subject catalog
            cat_key = current_category
            if cat_key not in category_map:
                category_map[cat_key] = {
                    'cusp': current_cusp,
                    'category': current_category,
                    'subjects': {}
                }
            
            sub_key = current_subject
            if sub_key not in category_map[cat_key]['subjects']:
                category_map[cat_key]['subjects'][sub_key] = []
            
            category_map[cat_key]['subjects'][sub_key].append({
                'id': rule_id,
                'event': clean_event,
                'srNo': sr_no,
                'houses': effective_houses,
                'verificationStatus': verification_status
            })

    # Additional Canon Rules / User Defined Events
    additional_rules = [
        {
            'id': 'kp.c2.tracking_movable_item_search',
            'cusp': 2,
            'category': '2nd Cusp (Wealth / Family / Speech / Assets)',
            'subject': 'WEALTH',
            'event': 'Tracking of movable item search',
            'srNo': 'MIS',
            'source': {
                'document': 'KP HOUSE GROUPING.docx',
                'page': 2,
                'tableIndex': 1,
                'rowIndex': 27,
                'tablePrefix': 'T1R27',
                'srNo': 'MIS'
            },
            'housesToBeSignified': [2, 6, 11],
            'jointDBA': {
                'raw': '2, 6, 11',
                'houses': [2, 6, 11],
                'parenthesizedHouses': []
            },
            'optionalHouses': [],
            'alternativeGroups': [[2], [6], [11]],
            'negativeHouses': [8, 12],
            'planetaryKarakas': [],
            'cuspSubLordChecks': [2],
            'specialConditions': [
                '2nd cusp sub-lord (2nd CSL) should signify 2 or 6 or 11',
                'Joint DBA of 2, 6, 11 must operate',
                'Negative houses 8 and 12 deny recovery'
            ],
            'remarks': '2nd cusp sub-lord (2nd CSL) should signify 2 or 6 or 11 in the Joint DBA of 2, 6, 11 for tracing/recovery of movable item. If 2nd CSL signifies 8 or 12, item is not recovered/lost.',
            'originalNotation': {
                'subjectMatter': 'Tracking of movable item search',
                'housesToBeSignified': '2 or 6 or 11',
                'jointDBA': '2, 6, 11',
                'remark': '2nd CSL should signify 2 or 6 or 11 in the joint DBA of 2, 6, 11',
                'cusp': '2',
                'srNo': 'MIS'
            },
            'verificationStatus': 'verified',
            'reviewFlags': []
        }
    ]

    for rule_entry in additional_rules:
        all_rules.append(rule_entry)
        cat_key = rule_entry['category']
        sub_key = rule_entry['subject']
        if cat_key in category_map and sub_key in category_map[cat_key]['subjects']:
            category_map[cat_key]['subjects'][sub_key].append({
                'id': rule_entry['id'],
                'event': rule_entry['event'],
                'srNo': rule_entry['srNo'],
                'houses': rule_entry['housesToBeSignified'],
                'verificationStatus': rule_entry['verificationStatus']
            })

    # Convert category map to structured array
    for cat_name, c_data in category_map.items():
        sub_list = []
        for s_name, events in c_data['subjects'].items():
            sub_list.append({
                'subject': s_name,
                'eventsCount': len(events),
                'events': events
            })
        category_catalog.append({
            'cusp': c_data['cusp'],
            'category': cat_name,
            'subjectsCount': len(sub_list),
            'totalEvents': sum(s['eventsCount'] for s in sub_list),
            'subjects': sub_list
        })

    # Sort category catalog by cusp
    category_catalog.sort(key=lambda x: x['cusp'])

    print(f'Successfully extracted {len(all_rules)} rules across {len(category_catalog)} categories!')
    
    # Save full rules JSON
    with open('src/data/kpHouseGroupingRules.json', 'w', encoding='utf-8') as f:
        json.dump(all_rules, f, indent=2, ensure_ascii=False)

    # Save category catalog JSON
    with open('src/data/kpHouseGroupingCatalog.json', 'w', encoding='utf-8') as f:
        json.dump(category_catalog, f, indent=2, ensure_ascii=False)

    # Generate ESM JS file
    with open('src/data/kpHouseGroupingRules.js', 'w', encoding='utf-8') as f:
        f.write('/**\n')
        f.write(' * KP House Grouping Rules Registry (Complete 19-Page Document Extraction)\n')
        f.write(f' * Total Rules: {len(all_rules)}\n')
        f.write(f' * Total Categories: {len(category_catalog)}\n')
        f.write(' */\n\n')
        f.write('export const KP_HOUSE_GROUPING_RULES = ')
        json.dump(all_rules, f, indent=2, ensure_ascii=False)
        f.write(';\n\n')
        f.write('export const KP_HOUSE_GROUPING_CATALOG = ')
        json.dump(category_catalog, f, indent=2, ensure_ascii=False)
        f.write(';\n\n')
        f.write('export default KP_HOUSE_GROUPING_RULES;\n')

    # Calculate statistics for reporting
    verified_count = sum(1 for r in all_rules if r['verificationStatus'] == 'verified')
    needs_review_count = sum(1 for r in all_rules if r['verificationStatus'] == 'needs-review')
    
    print(f'Verified Rules: {verified_count}')
    print(f'Needs Review Rules: {needs_review_count}')

if __name__ == '__main__':
    main()
