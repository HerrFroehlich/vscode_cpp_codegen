// THIS IS A TEST TOO
// BLUBB
#pragma once

#include "IShape.h"

namespace test {
class bla : public IShape {
public:
	void move_x (distance x =3) override;
	void move_y (distance y = {}) override;
	void rotate (angle rotation) override;
	class bla2
	{
	private:
		/* data */
	public:
		bla2(/* args */);
		~bla2();
	};
	
};
namespace test2 {
class bla : public IShape {
public:
	void move_x (distance x =3) override;
	class bla2
	{
	private:
		/* data */
	public:
		bla2(/* args */);
		~bla2();
	};
	
};
}

}


