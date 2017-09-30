#!/usr/bin/python

import os
import json
import string

def path_to_dict(path):
	file_name = os.path.basename(path);
	title_name = string.replace(os.path.splitext(file_name)[0], '_', ' ').title()
	d = {'title': title_name}
	if os.path.isdir(path):
		d['url'] = file_name
		d['menu'] = [path_to_dict(os.path.join(path,x)) for x in os.listdir(path) if not x == "Test"]
	else:
		d['url'] = file_name
	return d

def sorted_nested_menu(menu):
	if isinstance(menu, list):
		menu = sorted(menu, key=lambda x: (not 'menu' in x, x['title']))
		sorted_nested = []
		for item in menu:
			if 'menu' in item:
				item['menu'] = sorted_nested_menu(item['menu'])
			sorted_nested.append(item)
		return sorted_nested
	else:
		return menu

menu = path_to_dict('example')['menu']
menu = sorted_nested_menu(menu)

print(json.dumps(menu))