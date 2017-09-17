if (townHallObj.Member) {
    if (memberKey.charAt(1) == '.') {
        memberKey = memberKey.substring(2);
    }
}



if (memberKey.charAt(1) == '.') {
    memberKey = memberKey.substring(2);
}

str = "e.clyburn_james";
str2 = "burr,_richard";
str3 = "casey,jr._bob"; 
// var regx1 = /.\.(.+)/g.exec(str)[1];
var regx1 = /^[a-z]\.(.+)\_(.+)/g;
var regx10 = str.replace(/^[a-z]\./g, ""); // ex. e.clyburn_james

var regx2 = /(.+)\,\_(.+)/g;
var regx20 = str.replace(/[,]+/g, ""); // ex. burr,_richard

var regx3 = /(.+)\,(jr)\.\_(.+)/g;
var regx30 = str.replace(/\,(jr)\./g, ""); // ex casey,jr.bob