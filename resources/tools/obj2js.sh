#!/usr/bin/python

#Export OBJ with Normals & UVs & Forward +Y & Up +Z & Auto path

import sys
import json
from pprint import pprint

RES=1000.0

if len(sys.argv) != 3:
    print "use like this: ./convert.py input_file output_file"
    exit(1)
    
f = open(sys.argv[1], 'r')
#m = open(sys.argv[1][:-3] + "mtl", 'r')

def parse_uv(str):
    arr = l[2:].strip().split(' ')
    return {'u':float(round(float(arr[0])*RES))/RES, 'v':float(round(float(arr[1])*RES))/RES}

def parse_xyz(str):
    arr = l[2:].strip().split(' ')
    return {'x':float(round(float(arr[0])*RES))/RES, 'y':float(round(float(arr[1])*RES))/RES, 'z':float(round(float(arr[2])*RES))/RES}

obj = {'vertices': [], 'normals': [], 'texCoords':[]}
name = sys.argv[2][:-3]
normals = []
vertices = []
texCoords = []
output = ""
faces = 0
for l in f:
    
    if l[0] == 'o':
        name = l[2:].strip()
       
    if l[0:2] == 'vn':
        normals.append(parse_xyz(l[3:]))
    elif l[0:2] == 'vt':
        texCoords.append(parse_uv(l[3:]))
    elif l[0] == 'v':
        vertices.append(parse_xyz(l[2:]))
        
    if l[0:1] == 'f':
        arr = l[2:].strip().split(' ')
        
        for i in arr:
            faces = faces + 1
            n = i.split('/')
            obj["vertices"].append(vertices[int(n[0])-1]["x"])
            obj["vertices"].append(vertices[int(n[0])-1]["y"])
            obj["vertices"].append(vertices[int(n[0])-1]["z"])
            
            if len(n) == 3:
                obj["texCoords"].append(texCoords[int(n[1])-1]["u"])
                obj["texCoords"].append(texCoords[int(n[1])-1]["v"])
                obj["normals"].append(normals[int(n[2])-1]["x"])
                obj["normals"].append(normals[int(n[2])-1]["y"])
                obj["normals"].append(normals[int(n[2])-1]["z"])
               
        
    if l[0] == 'n':
        output += ""

# Return json
#json.dump(obj, open(sys.argv[2], 'w'))#, indent=0, separators=(',', ':'))
json.dump(obj, separators=(',', ':'), fp=open(sys.argv[2], 'w'))#)

# Prepend object name
import fileinput
for n,line in enumerate(fileinput.FileInput(sys.argv[2],inplace=1)):
    if n == 0: 
       print "//BlenderExport = {}"
       print "BlenderExport." + name + " = "
    print line

    print "BlenderExport." + name + ".indices = [];"
    print "for(var i=0;i<" + str(faces) + ";i++) BlenderExport." + name + ".indices.push(i);"

print name + " compiled"

